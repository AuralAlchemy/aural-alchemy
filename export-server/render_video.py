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

vol = modal.Volume.from_name("aural-alchemy-temp", create_if_missing=True)
RENDER_DIR = "/renders"
MAX_EXPORT_SECS = 7200  # reject requests over 2 hours


# ── GPU render worker ─────────────────────────────────────────────────────────

@app.function(image=image, gpu="A10G", timeout=600, memory=8192, volumes={RENDER_DIR: vol})
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
    audio_path: str | None,
    audio_fade_in: float = 0,
    audio_fade_out: float = 0,
):
    import tempfile

    work     = Path(tempfile.mkdtemp())
    tmp_in   = str(work / "input.mp4")
    tmp_loop = str(work / "loop.mp4")
    out_file = f"{RENDER_DIR}/{job_id}.mp4"
    err_file = f"{RENDER_DIR}/{job_id}.err"

    def fail(msg: str):
        vol.reload()
        with open(err_file, "w") as f:
            f.write(msg[:500])
        vol.commit()
        raise RuntimeError(msg)

    vol.reload()

    try:
        print(f"[{job_id}] downloading clip...")
        req = urllib.request.urlopen(clip_url, timeout=60)
        with open(tmp_in, "wb") as f:
            while chunk := req.read(1 << 16):
                f.write(chunk)
    except Exception as e:
        fail(f"download failed: {e}")

    if loop_out is None:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", tmp_in],
            capture_output=True, text=True, check=True, timeout=30,
        )
        loop_out = float(r.stdout.strip())

    region_dur = loop_out - loop_in
    if region_dur <= 0:
        fail(f"invalid loop region: {loop_in}s – {loop_out}s")

    pts       = 1.0 / speed
    loops     = int((duration * speed) / region_dur) + 2
    scale_map = {"1080": "1920:1080", "2k": "2560:1440", "4k": "3840:2160"}
    scale     = scale_map.get(resolution, "1920:1080")

    print(f"[{job_id}] trimming {loop_in}s–{loop_out}s ({region_dur:.1f}s)...")
    try:
        subprocess.run([
            "ffmpeg", "-y", "-ss", str(loop_in), "-t", str(region_dur),
            "-i", tmp_in, "-c", "copy", tmp_loop,
        ], check=True, timeout=60, capture_output=True)
    except Exception as e:
        fail(f"trim failed: {e}")

    vf_parts = [
        f"setpts={pts:.4f}*PTS",
        f"scale={scale}:force_original_aspect_ratio=decrease",
        f"pad={scale}:(ow-iw)/2:(oh-ih)/2",
        "format=yuv420p",
    ]
    if fade_in  > 0: vf_parts.append(f"fade=t=in:st=0:d={fade_in}")
    if fade_out > 0: vf_parts.append(f"fade=t=out:st={max(0, duration - fade_out)}:d={fade_out}")
    vf = ",".join(vf_parts)

    base_cmd = ["ffmpeg", "-y", "-stream_loop", str(loops), "-i", tmp_loop]
    if audio_path:
        base_cmd += ["-i", audio_path]
    base_cmd += ["-t", str(duration), "-vf", vf]

    encoded = False
    for codec, codec_args in [
        ("h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23", "-b:v", "0"]),
        ("libx264",    ["-c:v", "libx264", "-preset", "fast", "-crf", "23"]),
    ]:
        cmd = base_cmd + codec_args
        if audio_path:
            afi = audio_fade_in  if audio_fade_in  > 0 else fade_in
            afo = audio_fade_out if audio_fade_out > 0 else fade_out
            af = []
            if afi > 0: af.append(f"afade=t=in:st=0:d={afi}")
            if afo > 0: af.append(f"afade=t=out:st={max(0, duration - afo)}:d={afo}")
            cmd += ["-c:a", "aac", "-b:a", "192k"]
            if af: cmd += ["-af", ",".join(af)]
            cmd += ["-map", "0:v:0", "-map", "1:a:0", "-shortest"]
        else:
            cmd += ["-an"]
        cmd += ["-movflags", "+faststart", out_file]

        print(f"[{job_id}] encoding with {codec}...")
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=480)
            if result.returncode == 0:
                print(f"[{job_id}] done with {codec}")
                encoded = True
                break
            print(f"[{job_id}] {codec} failed: {result.stderr.decode()[-200:]}")
        except subprocess.TimeoutExpired:
            print(f"[{job_id}] {codec} timed out")

    if not encoded:
        fail("encode failed: both codecs failed or timed out")

    if audio_path:
        try: os.unlink(audio_path)
        except: pass

    vol.commit()
    size = os.path.getsize(out_file)
    print(f"[{job_id}] saved {size / 1024 / 1024:.1f}MB")
    return {"size": size}


# ── Web API (ASGI + CORS) ─────────────────────────────────────────────────────

@app.function(image=image, volumes={RENDER_DIR: vol})
@modal.asgi_app(label="aa-api")
def serve():
    from fastapi import FastAPI, Request, Response
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse, FileResponse

    CORS = {"Access-Control-Allow-Origin": "*"}

    def cjson(data, status_code=200):
        r = JSONResponse(data, status_code=status_code)
        r.headers.update(CORS)
        return r

    web_app = FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @web_app.options("/{path:path}")
    async def preflight(path: str):
        r = Response()
        r.headers["Access-Control-Allow-Origin"] = "*"
        r.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        r.headers["Access-Control-Allow-Headers"] = "*"
        return r

    @web_app.post("/export")
    async def export_endpoint(request: Request):
        audio_path     = None
        audio_fade_in  = 0.0
        audio_fade_out = 0.0
        try:
            content_type = request.headers.get("content-type", "")
            if "multipart/form-data" in content_type:
                form           = await request.form()
                clip_url       = form.get("clipUrl")
                loop_in        = float(form.get("loopIn")    or 0)
                loop_out_raw   = form.get("loopOut")
                loop_out       = float(loop_out_raw) if loop_out_raw else None
                duration       = float(form.get("duration")  or 60)
                speed          = float(form.get("speed")     or 1.0)
                resolution     = form.get("resolution")      or "1080"
                fade_in        = float(form.get("fadeIn")    or 0)
                fade_out       = float(form.get("fadeOut")   or 0)
                audio_fade_in  = float(form.get("audioFadeIn")  or 0)
                audio_fade_out = float(form.get("audioFadeOut") or 0)
                audio_file     = form.get("audio")
                job_id         = str(uuid.uuid4())
                if audio_file and hasattr(audio_file, "read"):
                    audio_path  = f"{RENDER_DIR}/audio_{job_id}"
                    audio_bytes = await audio_file.read()
                    with open(audio_path, "wb") as f:
                        f.write(audio_bytes)
                    vol.commit()
            else:
                body           = await request.json()
                clip_url       = body.get("clipUrl")
                loop_in        = float(body.get("loopIn")    or 0)
                loop_out_raw   = body.get("loopOut")
                loop_out       = float(loop_out_raw) if loop_out_raw else None
                duration       = float(body.get("duration")  or 60)
                speed          = float(body.get("speed")     or 1.0)
                resolution     = body.get("resolution")      or "1080"
                fade_in        = float(body.get("fadeIn")    or 0)
                fade_out       = float(body.get("fadeOut")   or 0)
                audio_fade_in  = float(body.get("audioFadeIn")  or 0)
                audio_fade_out = float(body.get("audioFadeOut") or 0)
                job_id         = str(uuid.uuid4())

            if not clip_url:
                return cjson({"error": "clipUrl required"}, 400)
            if duration > MAX_EXPORT_SECS:
                return cjson({"error": f"duration exceeds max {MAX_EXPORT_SECS}s"}, 400)

            render_video.spawn(
                job_id=job_id, clip_url=clip_url, loop_in=loop_in, loop_out=loop_out,
                duration=duration, speed=speed, resolution=resolution,
                fade_in=fade_in, fade_out=fade_out, audio_path=audio_path,
                audio_fade_in=audio_fade_in, audio_fade_out=audio_fade_out,
            )
            return cjson({"jobId": job_id, "status": "queued"})

        except Exception as e:
            print(f"export error: {e}")
            import traceback; traceback.print_exc()
            return cjson({"error": str(e)}, 500)

    @web_app.get("/status")
    async def status_endpoint(job_id: str):
        vol.reload()
        if Path(f"{RENDER_DIR}/{job_id}.err").exists():
            err = Path(f"{RENDER_DIR}/{job_id}.err").read_text()
            return cjson({"status": "error", "error": err})
        if Path(f"{RENDER_DIR}/{job_id}.mp4").exists():
            size = Path(f"{RENDER_DIR}/{job_id}.mp4").stat().st_size
            return cjson({"status": "done", "progress": 100, "size": size})
        return cjson({"status": "processing", "progress": 50})

    @web_app.get("/download")
    async def download_endpoint(job_id: str):
        vol.reload()
        out_file = Path(f"{RENDER_DIR}/{job_id}.mp4")
        if not out_file.exists():
            return cjson({"error": "not ready"}, 404)
        r = FileResponse(
            str(out_file),
            media_type="video/mp4",
            filename=f"aural-alchemy-{job_id[:8]}.mp4",
        )
        r.headers.update(CORS)
        return r

    return web_app
