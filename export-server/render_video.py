import modal
import os
import uuid
import subprocess
import urllib.request
from pathlib import Path

app = modal.App("aural-alchemy-render")

image = (
    modal.Image.from_registry("nvidia/cuda:12.3.2-base-ubuntu22.04", add_python="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "python-multipart")
)

# Temporary volume — files live here between render and download
vol = modal.Volume.from_name("aural-alchemy-temp", create_if_missing=True)
RENDER_DIR = "/renders"


# ── Core render function ──────────────────────────────────────────────────────

@app.function(
    image=image,
    gpu="A10G",
    timeout=3600,
    memory=8192,
    volumes={RENDER_DIR: vol},
)
def render_video(
    job_id: str,
    clip_url: str,
    loop_in: float,
    loop_out: float | None,
    duration: float,
    speed: float,
    resolution: str,
    fade_in: float,
    fade_out: float,
    audio_bytes: bytes | None,
):
    import tempfile

    work   = Path(tempfile.mkdtemp())
    tmp_in   = str(work / "input.mp4")
    tmp_loop = str(work / "loop.mp4")
    tmp_audio = str(work / "audio.audio") if audio_bytes else None
    out_file  = f"{RENDER_DIR}/{job_id}.mp4"

    print(f"[{job_id}] downloading clip...")
    urllib.request.urlretrieve(clip_url, tmp_in)

    # Get clip duration if loopOut not provided
    if loop_out is None:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", tmp_in],
            capture_output=True, text=True, check=True,
        )
        loop_out = float(r.stdout.strip())

    region_dur = loop_out - loop_in
    pts        = 1.0 / speed
    loops      = int((duration * speed) / region_dur) + 2
    scale_map  = {"1080": "1920:1080", "2k": "2560:1440", "4k": "3840:2160"}
    scale      = scale_map.get(resolution, "1920:1080")

    print(f"[{job_id}] trimming loop region {loop_in}s–{loop_out}s...")
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(loop_in), "-t", str(region_dur),
        "-i", tmp_in, "-c", "copy", tmp_loop,
    ], check=True)

    # Video filter chain
    vf_parts = [
        f"setpts={pts:.4f}*PTS",
        f"scale={scale}:force_original_aspect_ratio=decrease",
        f"pad={scale}:(ow-iw)/2:(oh-ih)/2",
        "format=yuv420p",
    ]
    if fade_in  > 0: vf_parts.append(f"fade=t=in:st=0:d={fade_in}")
    if fade_out > 0: vf_parts.append(f"fade=t=out:st={max(0, duration - fade_out)}:d={fade_out}")
    vf = ",".join(vf_parts)

    if audio_bytes:
        with open(tmp_audio, "wb") as f:
            f.write(audio_bytes)

    # Try GPU NVENC, fall back to CPU
    base_cmd = ["ffmpeg", "-y", "-stream_loop", str(loops), "-i", tmp_loop]
    if audio_bytes:
        base_cmd += ["-i", tmp_audio]
    base_cmd += ["-t", str(duration), "-vf", vf]

    for codec, codec_args in [
        ("h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23", "-b:v", "0"]),
        ("libx264",    ["-c:v", "libx264",    "-preset", "fast", "-crf", "23"]),
    ]:
        cmd = base_cmd + codec_args
        if audio_bytes:
            af = []
            if fade_in  > 0: af.append(f"afade=t=in:st=0:d={fade_in}")
            if fade_out > 0: af.append(f"afade=t=out:st={max(0, duration - fade_out)}:d={fade_out}")
            cmd += ["-c:a", "aac", "-b:a", "192k"]
            if af: cmd += ["-af", ",".join(af)]
            cmd += ["-map", "0:v:0", "-map", "1:a:0", "-shortest"]
        else:
            cmd += ["-an"]
        cmd += ["-movflags", "+faststart", out_file]

        print(f"[{job_id}] encoding with {codec}...")
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0:
            print(f"[{job_id}] done with {codec}")
            break
        print(f"[{job_id}] {codec} failed, trying next...")
    else:
        raise RuntimeError("All codecs failed:\n" + result.stderr.decode()[-500:])

    vol.commit()
    size = os.path.getsize(out_file)
    print(f"[{job_id}] saved {size / 1024 / 1024:.1f}MB → {out_file}")
    return {"size": size}


# ── Web endpoints ─────────────────────────────────────────────────────────────

web_image = image.pip_install("fastapi[standard]")

@app.function(image=web_image)
@modal.fastapi_endpoint(method="POST", label="aa-export")
async def export_endpoint(request):
    from fastapi import Request
    from fastapi.responses import JSONResponse

    body = await request.json()
    clip_url   = body.get("clipUrl")
    loop_in    = float(body.get("loopIn", 0))
    loop_out   = float(body.get("loopOut")) if body.get("loopOut") else None
    duration   = float(body.get("duration", 60))
    speed      = float(body.get("speed", 1.0))
    resolution = body.get("resolution", "1080")
    fade_in    = float(body.get("fadeIn", 0))
    fade_out   = float(body.get("fadeOut", 0))

    if not clip_url:
        return JSONResponse({"error": "clipUrl required"}, status_code=400)

    job_id = str(uuid.uuid4())
    render_video.spawn(
        job_id=job_id, clip_url=clip_url, loop_in=loop_in, loop_out=loop_out,
        duration=duration, speed=speed, resolution=resolution,
        fade_in=fade_in, fade_out=fade_out, audio_bytes=None,
    )
    return JSONResponse({"jobId": job_id, "status": "queued"})


@app.function(image=web_image, volumes={RENDER_DIR: vol})
@modal.fastapi_endpoint(method="GET", label="aa-status")
async def status_endpoint(request):
    from fastapi.responses import JSONResponse

    job_id = request.query_params.get("jobId")
    if not job_id:
        return JSONResponse({"error": "jobId required"}, status_code=400)

    vol.reload()
    out_file = Path(f"{RENDER_DIR}/{job_id}.mp4")
    if out_file.exists():
        size = out_file.stat().st_size
        return JSONResponse({
            "status": "done",
            "progress": 100,
            "size": size,
            "downloadUrl": f"?jobId={job_id}",  # placeholder — download endpoint returns the file
        })
    return JSONResponse({"status": "processing", "progress": 50})


@app.function(image=web_image, volumes={RENDER_DIR: vol}, timeout=600)
@modal.fastapi_endpoint(method="GET", label="aa-download")
async def download_endpoint(request):
    from fastapi.responses import FileResponse, JSONResponse

    job_id = request.query_params.get("jobId")
    if not job_id:
        return JSONResponse({"error": "jobId required"}, status_code=400)

    vol.reload()
    out_file = Path(f"{RENDER_DIR}/{job_id}.mp4")
    if not out_file.exists():
        return JSONResponse({"error": "file not found or not ready"}, status_code=404)

    return FileResponse(
        str(out_file),
        media_type="video/mp4",
        filename=f"aural-alchemy-{job_id[:8]}.mp4",
    )
