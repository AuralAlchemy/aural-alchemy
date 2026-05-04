const express  = require('express');
const cors     = require('cors');
const { exec } = require('child_process');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const { v4: uuidv4 } = require('uuid');
const multer   = require('multer');

const app  = express();
const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EXPORTS_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR);

// multer for audio file uploads — store in exports dir temporarily
const upload = multer({
  dest: EXPORTS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files allowed'));
  }
});

// Auto-delete exports after 48 hours
setInterval(() => {
  const now = Date.now();
  fs.readdirSync(EXPORTS_DIR).forEach(f => {
    const fp = path.join(EXPORTS_DIR, f);
    try {
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > 48 * 60 * 60 * 1000) fs.unlinkSync(fp);
    } catch(e) {}
  });
}, 60 * 60 * 1000);

app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use('/exports', express.static(EXPORTS_DIR));
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Aural Alchemy Export Server' }));

const jobs = {};

// Handle both JSON (no audio) and multipart (with audio)
app.post('/export', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.single('audio')(req, res, next);
  } else {
    express.json({ limit: '1mb' })(req, res, next);
  }
}, async (req, res) => {
  const body = req.body || {};
  const clipUrl    = body.clipUrl;
  const loopIn     = parseFloat(body.loopIn)  || 0;
  const loopOut    = parseFloat(body.loopOut)  || null;
  const duration   = parseFloat(body.duration) || 60;
  const speed      = parseFloat(body.speed)    || 1.0;
  const resolution = body.resolution || '1080';
  const email      = body.email;
  const fadeIn     = parseFloat(body.fadeIn)   || 0;
  const fadeOut    = parseFloat(body.fadeOut)  || 0;
  const audioFile  = req.file || null;

  if (!clipUrl)   return res.status(400).json({ error: 'clipUrl required' });
  if (!email)     return res.status(400).json({ error: 'email required' });
  if (isNaN(duration)) return res.status(400).json({ error: 'invalid duration' });

  const jobId   = uuidv4();
  const tmpIn   = path.join(EXPORTS_DIR, `${jobId}_input.mp4`);
  const tmpLoop = path.join(EXPORTS_DIR, `${jobId}_loop.mp4`);
  const outFile = path.join(EXPORTS_DIR, `${jobId}_output.mp4`);
  const audioPath = audioFile ? audioFile.path : null;

  jobs[jobId] = { status: 'downloading', progress: 0, error: null, url: null };
  res.json({ jobId });

  processExport({ jobId, clipUrl, loopIn, loopOut, duration, speed, resolution, email, fadeIn, fadeOut, audioPath, tmpIn, tmpLoop, outFile });
});

app.get('/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

async function processExport({ jobId, clipUrl, loopIn, loopOut, duration, speed, resolution, email, fadeIn, fadeOut, audioPath, tmpIn, tmpLoop, outFile }) {
  const job = jobs[jobId];
  try {
    job.status = 'downloading'; job.progress = 5;
    await downloadFile(clipUrl, tmpIn);
    job.progress = 25;

    const clipDur   = loopOut || await getVideoDuration(tmpIn);
    const regionDur = clipDur - loopIn;
    const pts       = (1 / speed).toFixed(4);
    const loops     = Math.ceil((duration * speed) / regionDur) + 2;
    const scaleMap  = { '1080': '1920:1080', '2k': '2560:1440', '4k': '3840:2160' };
    const scale     = scaleMap[resolution] || '1920:1080';

    job.status = 'processing'; job.progress = 35;

    const trimCmd = `ffmpeg -y -ss ${loopIn} -t ${regionDur} -i "${tmpIn}" -c copy "${tmpLoop}"`;
    await runCmd(trimCmd, jobId);
    job.progress = 50;
    console.log(`[${jobId}] trim done, encoding ${duration}s...`);
    job.progress = 60;

    const filters = [
      `setpts=${pts}*PTS`,
      `scale=${scale}:force_original_aspect_ratio=decrease`,
      `pad=${scale}:(ow-iw)/2:(oh-ih)/2`,
      `format=yuv420p`,
    ];
    if (fadeIn  > 0) filters.push(`fade=t=in:st=0:d=${fadeIn}`);
    if (fadeOut > 0) filters.push(`fade=t=out:st=${Math.max(0, duration - fadeOut)}:d=${fadeOut}`);
    const vf = filters.join(',');

    let mainCmd;
    if (audioPath) {
      const aFilters = [];
      if (fadeIn  > 0) aFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
      if (fadeOut > 0) aFilters.push(`afade=t=out:st=${Math.max(0, duration - fadeOut)}:d=${fadeOut}`);
      const af = aFilters.length ? `-af "${aFilters.join(',')}"` : '';

      mainCmd = [
        'ffmpeg -y',
        `-stream_loop ${loops} -i "${tmpLoop}"`,
        `-i "${audioPath}"`,
        `-t ${duration}`,
        `-vf "${vf}"`,
        '-c:v libx264 -preset ultrafast -crf 23',
        '-c:a aac -b:a 192k',
        af,
        '-map 0:v:0 -map 1:a:0',
        '-shortest',
        '-movflags +faststart',
        `"${outFile}"`
      ].filter(Boolean).join(' ');
    } else {
      mainCmd = [
        'ffmpeg -y',
        `-stream_loop ${loops} -i "${tmpLoop}"`,
        `-t ${duration}`,
        `-vf "${vf}"`,
        '-c:v libx264 -preset ultrafast -crf 23',
        '-an',
        '-movflags +faststart',
        `"${outFile}"`
      ].join(' ');
    }

    await runCmd(mainCmd, jobId);
    job.progress = 90;

    [tmpIn, tmpLoop].forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });
    if (audioPath) { try { fs.unlinkSync(audioPath); } catch(e) {} }

    const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
    job.status   = 'done';
    job.progress = 100;
    job.url      = `${BASE_URL}/exports/${path.basename(outFile)}`;
    job.size     = fs.statSync(outFile).size;
    console.log(`[${jobId}] done → ${job.url}`);

    if (email && RESEND_API_KEY) await sendEmail(email, job.url, job.size);

  } catch(err) {
    console.error(`[${jobId}] error:`, err.message);
    job.status = 'error';
    job.error  = err.message.slice(0, 300);
    [tmpIn, tmpLoop, outFile].forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });
    if (audioPath) { try { fs.unlinkSync(audioPath); } catch(e) {} }
  }
}

async function sendEmail(to, downloadUrl, size) {
  const sizeMB = (size / 1024 / 1024).toFixed(1);
  const html = `
<!DOCTYPE html>
<html>
<body style="background:#080c18;color:#c8d0e0;font-family:Arial,sans-serif;padding:40px;margin:0;">
  <div style="max-width:480px;margin:0 auto;text-align:center;">
    <div style="font-size:0.7rem;letter-spacing:0.3em;color:#5a6278;margin-bottom:8px;">AURAL ALCHEMY</div>
    <h1 style="font-size:1.3rem;color:#4dd9c0;margin-bottom:6px;font-weight:400;letter-spacing:0.15em;">Your export is ready</h1>
    <p style="color:#5a6278;font-size:0.85rem;margin-bottom:32px;">${sizeMB}MB · Available for 48 hours</p>
    <a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,rgba(77,217,192,0.2),rgba(201,168,76,0.1));border:1px solid #4dd9c0;border-radius:8px;padding:14px 32px;color:#4dd9c0;text-decoration:none;font-size:0.85rem;letter-spacing:0.1em;">
      DOWNLOAD MP4
    </a>
    <p style="color:#5a6278;font-size:0.75rem;margin-top:32px;">alchemyaural.com</p>
  </div>
</body>
</html>`;

  const body = JSON.stringify({
    from: 'Aural Alchemy <exports@alchemyaural.com>',
    to: [to],
    subject: 'Your Aural Alchemy export is ready',
    html,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('email sent to', to, res.statusCode);
        resolve(data);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`Download failed: ${res.statusCode}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

function runCmd(cmd, jobId) {
  return new Promise((resolve, reject) => {
    console.log(`[${jobId||'cmd'}] ${cmd.substring(0, 100)}...`);
    const start = Date.now();
    exec(cmd, { maxBuffer: 200 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (err) {
        console.error(`[${jobId||'cmd'}] FAILED after ${elapsed}s:`, stderr?.slice(-300) || err.message);
        reject(new Error(stderr?.slice(-300) || err.message));
      } else {
        console.log(`[${jobId||'cmd'}] done in ${elapsed}s`);
        resolve(stdout);
      }
    });
  });
}

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (err, stdout) => {
        if (err) reject(err);
        else resolve(parseFloat(stdout.trim()));
      }
    );
  });
}

app.listen(PORT, () => console.log(`Aural Alchemy export server on port ${PORT}`));
