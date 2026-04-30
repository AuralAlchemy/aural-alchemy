# Aural Alchemy Export Server

FFmpeg-powered video export server. Receives clip settings from the browser, loops + processes the video, returns a download URL.

## Deploy to Render.com (free)

1. Push this folder to a GitHub repo (can be same repo as your site, in a subfolder)

2. Go to render.com → New → Web Service → connect your GitHub repo

3. Set these fields:
   - Root Directory: `export-server` (or wherever you put this folder)
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: Free

4. Click Deploy

5. Once deployed, copy your Render URL (e.g. `https://aural-alchemy-export.onrender.com`)

6. Go to Render dashboard → Environment → add:
   - Key: `BASE_URL`
   - Value: your Render URL (e.g. `https://aural-alchemy-export.onrender.com`)

7. Paste your Render URL into loop-poc.html where it says `EXPORT_SERVER_URL`

## API

### POST /export
Start an export job.

```json
{
  "clipUrl": "https://videos.pexels.com/...",
  "loopIn": 5.2,
  "loopOut": 18.4,
  "duration": 3600,
  "speed": 0.5,
  "resolution": "1080"
}
```

Returns: `{ "jobId": "uuid" }`

### GET /status/:jobId
Poll for job status.

Returns one of:
```json
{ "status": "downloading", "progress": 5 }
{ "status": "processing",  "progress": 60 }
{ "status": "done",        "progress": 100, "url": "https://...", "size": 123456 }
{ "status": "error",       "error": "message" }
```

## Notes
- FFmpeg is pre-installed on Render's free Ubuntu instances
- Exports are auto-deleted after 1 hour
- Free Render plan sleeps after 15min inactivity — first request after sleep takes ~30s to wake up
- For production, upgrade to Render Starter ($7/mo) for always-on
