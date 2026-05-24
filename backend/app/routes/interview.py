"""
AI Interview route — OpenAI/Ollama chat, OpenAI Whisper transcription,
D-ID real-time streaming (WebRTC) for the avatar interviewer, and
ElevenLabs TTS when D-ID is unavailable (pairs with the 2D avatar in the UI).
"""
from __future__ import annotations

import base64
import io
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Response
from PIL import Image
from pydantic import BaseModel

from app.config import settings
from app.http_client import get_http_client

router = APIRouter()

# ─── Config (read from central settings so pydantic validates them) ───────────
OPENAI_API_KEY  = settings.openai_api_key or ""
OPENAI_BASE_URL = settings.openai_base_url
OPENAI_MODEL    = settings.openai_model

OLLAMA_URL   = settings.ollama_url
OLLAMA_MODEL = settings.ollama_model

DID_API_KEY  = settings.did_api_key or ""
DID_BASE_URL = "https://api.d-id.com"

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

# ── Presenter URL: auto-upload from backend/public → D-ID /images (cached) ───
_LOCAL_AVATAR_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public")
_cached_presenter_url: Optional[str] = None


def _compress_for_did(image_bytes: bytes) -> bytes:
    """Resize/compress to JPEG (max ~1024px) so D-ID accepts the file."""
    im = Image.open(io.BytesIO(image_bytes))
    im = im.convert("RGB")
    im.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    im.save(out, format="JPEG", quality=88)
    return out.getvalue()


async def prime_did_presenter_from_disk() -> None:
    """Upload backend/public/avatar.* to D-ID once and cache the hosted URL."""
    global _cached_presenter_url
    if not DID_API_KEY or _cached_presenter_url:
        return
    for ext in ("jpg", "jpeg", "png", "webp"):
        path = os.path.join(_LOCAL_AVATAR_DIR, f"avatar.{ext}")
        if not os.path.isfile(path):
            continue
        try:
            with open(path, "rb") as f:
                raw = f.read()
            body = _compress_for_did(raw)
            client = get_http_client()
            resp = await client.post(
                f"{DID_BASE_URL}/images",
                headers={"Authorization": _did_headers()["Authorization"]},
                files={"image": ("avatar.jpg", body, "image/jpeg")},
            )
            if resp.status_code not in (200, 201):
                return
            data = resp.json()
            url = data.get("url")
            if url:
                _cached_presenter_url = url
        except Exception:
            pass
        return


def _get_presenter_url(override: Optional[str] = None) -> str:
    """
    D-ID source_url priority (matches reference AI Interviewer):
      1. Explicit override (e.g. client-uploaded image URL)
      2. Cached URL from auto-upload of backend/public/avatar.*
      3. BACKEND_PUBLIC_URL + /public/avatar.* if file exists
      4. settings.did_presenter_url
    """
    if override and override.strip():
        return override.strip()
    if _cached_presenter_url:
        return _cached_presenter_url
    base = (settings.backend_public_url or "").rstrip("/")
    if base:
        for ext in ("jpg", "jpeg", "png", "webp"):
            local_path = os.path.join(_LOCAL_AVATAR_DIR, f"avatar.{ext}")
            if os.path.isfile(local_path):
                return f"{base}/public/avatar.{ext}"
    return settings.did_presenter_url


# ─── Request/Response models ──────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    domain: str
    score: float           # accuracy percentage from rapid fire
    correct: int
    total: int
    topics_missed: list[str] = []


class StartInterviewResponse(BaseModel):
    session_id: str
    greeting: str
    first_question: str


class ChatRequest(BaseModel):
    session_id: str
    user_message: str
    history: list[dict]    # [{role, content}]
    domain: str
    score: float


class ChatResponse(BaseModel):
    reply: str
    is_closing: bool = False


class DIDCreateStreamRequest(BaseModel):
    session_id: str
    presenter_url: Optional[str] = None


class DIDSdpRequest(BaseModel):
    stream_id: str
    session_id: str
    answer: dict           # SDP answer object


class DIDIceRequest(BaseModel):
    stream_id: str
    session_id: str
    candidate: str
    sdp_mid: str
    sdp_mline_index: int


class DIDSpeakRequest(BaseModel):
    stream_id: str
    session_id: str
    text: str


class TTSRequest(BaseModel):
    text: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_system_prompt(domain: str, score: float, topics_missed: list[str]) -> str:
    missed = ", ".join(topics_missed) if topics_missed else "none identified"
    level = (
        "strong" if score >= 80
        else "moderate" if score >= 55
        else "beginner"
    )
    return f"""You are Alex, a warm but rigorous technical interviewer at a top-tier tech company.
You are conducting a follow-up live interview for a candidate who just completed a rapid-fire quiz.

Domain: {domain}
Rapid-fire accuracy: {score:.0f}% ({level} level)
Topics the candidate struggled with: {missed}

Your job:
1. Start with a brief, encouraging opener (1-2 sentences).
2. Ask one technical question at a time — clear, conversational, not too long.
3. Probe weak areas from their rapid-fire performance naturally.
4. Acknowledge answers briefly before moving on (e.g. "Good point.", "Exactly.", "Hmm, close—").
5. After 4-6 exchanges, wrap up warmly with brief feedback.
6. Keep every response under 60 words. Sound human, not robotic.
7. When you are ready to close the interview, end your message with the exact token: [INTERVIEW_COMPLETE]
8. Never repeat or closely paraphrase a question you already asked in this conversation — each follow-up must be new.

DO NOT reveal you are an AI unless directly asked. Stay in character as Alex."""


async def _call_openai(messages: list[dict]) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": OPENAI_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 200,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()


async def _call_ollama(messages: list[dict]) -> str:
    models: list[str] = []
    primary = (OLLAMA_MODEL or "").strip()
    if primary:
        models.append(primary)
    fallbacks = [m.strip() for m in (settings.ollama_fallback_models or "").split(",") if m.strip()]
    for m in fallbacks:
        if m not in models:
            models.append(m)

    async with httpx.AsyncClient(timeout=60) as client:
        last_err: Optional[Exception] = None
        for model_name in models:
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": model_name,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": 0.7, "num_predict": 200},
                    },
                )
                if resp.status_code != 200:
                    continue
                return resp.json()["message"]["content"].strip()
            except Exception as e:
                last_err = e
                continue

    if last_err:
        raise last_err
    raise RuntimeError("No Ollama model available (primary or fallback models failed)")


async def _get_ai_response(messages: list[dict]) -> str:
    """Try OpenAI first, fall back to Ollama."""
    if OPENAI_API_KEY:
        try:
            return await _call_openai(messages)
        except Exception:
            pass
    return await _call_ollama(messages)


def _did_headers() -> dict:
    # D-ID expects standard HTTP Basic: base64("{api_key}:") — username=key, empty password
    raw = DID_API_KEY.strip()
    token = f"{raw}:".encode("utf-8")
    encoded = base64.b64encode(token).decode("ascii")
    return {
        "Authorization": f"Basic {encoded}",
        "Content-Type": "application/json",
    }


def _normalize_webrtc_offer(offer) -> Optional[dict]:
    """D-ID may return {type,sdp}, a bare sdp string, or nested shapes — normalize for the browser."""
    if offer is None:
        return None
    if isinstance(offer, str):
        return {"type": "offer", "sdp": offer}
    if isinstance(offer, dict):
        sdp = offer.get("sdp")
        if sdp:
            return {"type": offer.get("type") or "offer", "sdp": sdp}
    return None


def _normalize_ice_servers(servers) -> list:
    out: list = []
    for s in servers or []:
        if isinstance(s, str):
            out.append({"urls": s})
        elif isinstance(s, dict):
            if "urls" in s:
                out.append(s)
            elif "url" in s:
                out.append({"urls": s["url"]})
    return out


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(req: StartInterviewRequest):
    """Generate a greeting + first interview question based on rapid-fire results."""
    system_prompt = _build_system_prompt(req.domain, req.score, req.topics_missed)
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"[START] The candidate scored {req.correct}/{req.total} "
                f"({req.score:.0f}%) on {req.domain}. "
                "Please greet them and ask your first question."
            ),
        },
    ]
    try:
        reply = await _get_ai_response(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {e}")

    import uuid
    session_id = str(uuid.uuid4())

    # Split greeting from first question (heuristic: sentence boundary)
    parts = reply.split(". ", 1)
    greeting = parts[0].strip() + "." if len(parts) > 1 else reply
    first_question = parts[1].strip() if len(parts) > 1 else reply

    return StartInterviewResponse(
        session_id=session_id,
        greeting=greeting,
        first_question=first_question,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send user message and get AI interviewer response."""
    system_prompt = _build_system_prompt(req.domain, req.score, [])
    messages = [{"role": "system", "content": system_prompt}] + req.history + [
        {"role": "user", "content": req.user_message}
    ]
    try:
        reply = await _get_ai_response(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {e}")

    is_closing = "[INTERVIEW_COMPLETE]" in reply
    clean_reply = reply.replace("[INTERVIEW_COMPLETE]", "").strip()
    return ChatResponse(reply=clean_reply, is_closing=is_closing)


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured for Whisper")

    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"

    client = get_http_client()
    resp = await client.post(
        f"{OPENAI_BASE_URL}/audio/transcriptions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        files={"file": (filename, audio_bytes, audio.content_type or "audio/webm")},
        data={"model": "whisper-1"},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {"text": resp.json().get("text", "")}


# ─── ElevenLabs TTS (fallback when D-ID is off or fails) ─────────────────────

@router.post("/tts")
async def elevenlabs_tts(req: TTSRequest):
    """
    Synthesize speech via ElevenLabs. Used by the frontend with the 2D avatar when D-ID is unavailable.
    Returns 503 if ELEVENLABS_API_KEY is not set (client should use browser TTS).
    """
    key = (settings.elevenlabs_api_key or "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="ElevenLabs not configured")

    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 8000:
        text = text[:8000]

    voice_id = (settings.elevenlabs_voice_id or "").strip() or "21m00Tcm4TlvDq8ikWAM"
    model_id = (settings.elevenlabs_model_id or "").strip() or "eleven_multilingual_v2"
    url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}"

    client = get_http_client()
    resp = await client.post(
        url,
        headers={
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={"text": text, "model_id": model_id},
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs error: {resp.text[:800]}",
        )

    return Response(content=resp.content, media_type="audio/mpeg")


# ─── D-ID Streaming routes ────────────────────────────────────────────────────

@router.post("/did/upload-presenter")
async def did_upload_presenter(image: UploadFile = File(...)):
    """Upload a face image to D-ID and return a hosted URL (same flow as reference app)."""
    if not DID_API_KEY:
        raise HTTPException(status_code=400, detail="DID_API_KEY not configured")
    raw = await image.read()
    try:
        body = _compress_for_did(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}") from e

    client = get_http_client()
    resp = await client.post(
        f"{DID_BASE_URL}/images",
        headers={"Authorization": _did_headers()["Authorization"]},
        files={"image": ("avatar.jpg", body, "image/jpeg")},
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=502, detail="D-ID upload did not return a URL")
    return {"url": url}


@router.post("/did/create-stream")
async def did_create_stream(req: DIDCreateStreamRequest):
    """Create a D-ID real-time streaming session and return SDP offer + ice servers."""
    if not DID_API_KEY:
        raise HTTPException(status_code=400, detail="DID_API_KEY not configured")

    await prime_did_presenter_from_disk()

    source = _get_presenter_url(req.presenter_url)
    client = get_http_client()
    resp = await client.post(
        f"{DID_BASE_URL}/talks/streams",
        headers=_did_headers(),
        json={
            "source_url": source,
            "config": {"stitch": True},
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    raw_offer = data.get("offer") or data.get("webrtc_offer")
    norm_offer = _normalize_webrtc_offer(raw_offer)
    if not norm_offer:
        raise HTTPException(
            status_code=502,
            detail="D-ID response missing WebRTC offer (check API key and presenter image URL).",
        )
    return {
        "stream_id": data.get("id"),
        "session_id": data.get("session_id"),
        "offer": norm_offer,
        "ice_servers": _normalize_ice_servers(data.get("ice_servers")),
    }


@router.post("/did/sdp-answer")
async def did_sdp_answer(req: DIDSdpRequest):
    """Send the WebRTC SDP answer back to D-ID."""
    if not DID_API_KEY:
        raise HTTPException(status_code=400, detail="DID_API_KEY not configured")

    client = get_http_client()
    resp = await client.post(
        f"{DID_BASE_URL}/talks/streams/{req.stream_id}/sdp",
        headers=_did_headers(),
        json={"answer": req.answer, "session_id": req.session_id},
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


@router.post("/did/ice")
async def did_ice(req: DIDIceRequest):
    """Forward ICE candidate to D-ID."""
    if not DID_API_KEY:
        raise HTTPException(status_code=400, detail="DID_API_KEY not configured")

    client = get_http_client()
    resp = await client.post(
        f"{DID_BASE_URL}/talks/streams/{req.stream_id}/ice",
        headers=_did_headers(),
        json={
            "candidate": req.candidate,
            "sdpMid": req.sdp_mid,
            "sdpMLineIndex": req.sdp_mline_index,
            "session_id": req.session_id,
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {"ok": True}


@router.post("/did/speak")
async def did_speak(req: DIDSpeakRequest):
    """Send text for the D-ID avatar to speak (POST /talks/streams/{id} — reference contract)."""
    if not DID_API_KEY:
        raise HTTPException(status_code=400, detail="DID_API_KEY not configured")

    client = get_http_client()
    resp = await client.post(
        f"{DID_BASE_URL}/talks/streams/{req.stream_id}",
        headers=_did_headers(),
        json={
            "session_id": req.session_id,
            "script": {
                "type": "text",
                "input": req.text,
                "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"},
            },
            "config": {"stitch": True, "fluent": True, "pad_audio": 0},
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


@router.delete("/did/stream/{stream_id}")
async def did_close_stream(stream_id: str, session_id: str):
    """Close a D-ID streaming session (JSON body matches D-ID / reference)."""
    if not DID_API_KEY:
        return {"ok": True}

    client = get_http_client()
    await client.request(
        "DELETE",
        f"{DID_BASE_URL}/talks/streams/{stream_id}",
        headers=_did_headers(),
        json={"session_id": session_id},
    )

    return {"ok": True}
