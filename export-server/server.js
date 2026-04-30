const express  = require('express');
const cors     = require('cors');
const { exec } = require('child_process');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Where exported files live ─────────────────────────────────────────────────
const EXPORTS_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR);

// ── Auto-delete exports after 1 hour ─────────────────────────────────────────
setInterval(() => {
  const files = fs.readdirSync(EXPORTS_DIR);
  const now   = Date.now();
  files.forEach(f => {
    const fp   = path.join(EXPORTS_DIR, f);
    const stat = fs.statSync(fp);
    if (now - stat.mtimeMs > 60 * 60 * 1000) fs.unlinkSync(fp);
  });
}, 10 * 60 * 1000);

app.use(cors());
app.use(express.json());

// Serve exported files for download
app.use('/exports', express.static(EXPORTS_DIR));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Aural Alchemy Export Server' }));

// ── Job store (in-memory, fine for single server) ─────────────────────────────
const jobs = {};

// ── POST /export — start a job ────────────────────────────────────────────────
app.post('/export', async (req, res) => {
  const {
    clipUrl,          // Pexels direct video URL
    loopIn  = 0,      // loop region start (seconds)
    loopOut,          // loop region end (seconds) — null = full clip
    duration = 60,    // target output duration (seconds)
    speed    = 0.5,   // playback speed (0.1 - 1.0)
    resolution = '1080', // '1080' | '2k' | '4k'
  } = req.body;

  if (!clipUrl) return res.status(400).json({ error: 'clipUrl required' });

  const jobId   = uuidv4();
  const tmpIn   = path.join(EXPORTS_DIR, `${jobId}_input.mp4`);
  const tmpLoop = path.join(EXPORTS_DIR, `${jobId}_loop.mp4`);
  const outFile = path.join(EXPORTS_DIR, `${jobId}_output.mp4`);

  jobs[jobId] = { status: 'downloading', progress: 0, error: null, url: null };
  res.json({ jobId });

  // Run async
  processExport({ jobId, clipUrl, loopIn, loopOut, duration, speed, resolution, tmpIn, tmpLoop, outFile });
});

// ── GET /status/:jobId — poll job status ──────────────────────────────────────
app.get('/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

// ── Core processing ───────────────────────────────────────────────────────────
async function processExport({ jobId, clipUrl, loopIn, loopOut, duration, speed, resolution, tmpIn, tmpLoop, outFile }) {
  const job = jobs[jobId];

  try {
    // 1. Download clip
    job.status = 'downloading'; job.progress = 5;
    await downloadFile(clipUrl, tmpIn);
    job.progress = 25;

    // 2. Get clip duration if loopOut not specified
    const clipDur = loopOut || await getVideoDuration(tmpIn);
    const regionDur = clipDur - loopIn;

    // 3. Build FFmpeg command
    // Strategy: trim to loop region, then loop it to fill target duration, apply speed
    const pts    = (1 / speed).toFixed(4);  // setpts multiplier (2.0 = half speed)
    const loops  = Math.ceil((duration * speed) / regionDur) + 1; // how many loops needed

    // Scale based on resolution
    const scaleMap = { '1080': '1920:1080', '2k': '2560:1440', '4k': '3840:2160' };
    const scale    = scaleMap[resolution] || '1920:1080';

    job.status = 'processing'; job.progress = 35;

    // Step 1: Trim to loop region
    const trimCmd = [
      'ffmpeg -y',
      `-ss ${loopIn}`,
      `-t ${regionDur}`,
      `-i "${tmpIn}"`,
      '-c copy',
      `"${tmpLoop}"`
    ].join(' ');

    await runCmd(trimCmd);
    job.progress = 50;

    // Step 2: Loop + slow down + scale + encode to final MP4
    const mainCmd = [
      'ffmpeg -y',
      `-stream_loop ${loops}`,
      `-i "${tmpLoop}"`,
      `-t ${duration}`,
      `-vf "setpts=${pts}*PTS,scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2"`,
      '-c:v libx264',
      '-preset fast',
      '-crf 18',
      '-pix_fmt yuv420p',
      '-movflags +faststart',
      '-an',  // no audio (user provides their own music)
      `"${outFile}"`
    ].join(' ');

    await runCmd(mainCmd);
    job.progress = 90;

    // Cleanup temp files
    [tmpIn, tmpLoop].forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });

    // Build download URL
    const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
    job.status   = 'done';
    job.progress = 100;
    job.url      = `${BASE_URL}/exports/${path.basename(outFile)}`;
    job.size     = fs.statSync(outFile).size;

    console.log(`[${jobId}] done → ${job.url}`);

  } catch (err) {
    console.error(`[${jobId}] error:`, err.message);
    job.status = 'error';
    job.error  = err.message;
    [tmpIn, tmpLoop, outFile].forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    console.log('[ffmpeg]', cmd.substring(0, 120) + '...');
    exec(cmd, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
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

app.listen(PORT, () => console.log(`Aural Alchemy export server running on port ${PORT}`));
