import axios from 'axios';

const BASE = '/api/interview';

export interface StartInterviewRequest {
  domain: string;
  score: number;
  correct: number;
  total: number;
  topics_missed?: string[];
}

export interface StartInterviewResponse {
  session_id: string;
  greeting: string;
  first_question: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  is_closing: boolean;
}

export interface DIDStreamData {
  stream_id: string;
  session_id: string;
  offer: RTCSessionDescriptionInit;
  ice_servers: RTCIceServer[];
}

const interviewService = {
  async startInterview(req: StartInterviewRequest): Promise<StartInterviewResponse> {
    const { data } = await axios.post<StartInterviewResponse>(`${BASE}/start`, {
      ...req,
      topics_missed: req.topics_missed ?? [],
    });
    return data;
  },

  async chat(
    session_id: string,
    user_message: string,
    history: ChatMessage[],
    domain: string,
    score: number,
  ): Promise<ChatResponse> {
    const { data } = await axios.post<ChatResponse>(`${BASE}/chat`, {
      session_id,
      user_message,
      history,
      domain,
      score,
    });
    return data;
  },

  /**
   * ElevenLabs TTS via backend (MP3). Returns null if not configured (503) or on failure.
   */
  async speakTTS(text: string): Promise<Blob | null> {
    try {
      const res = await axios.post<Blob>(`${BASE}/tts`, { text }, {
        responseType: 'blob',
        validateStatus: (s) => s === 200 || s === 503 || s === 502,
      });
      if (res.status !== 200) return null;
      const blob = res.data;
      if (!blob || blob.size === 0) return null;
      return blob;
    } catch {
      return null;
    }
  },

  async transcribeAudio(blob: Blob, mimeType: string): Promise<string> {
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('audio', blob, `recording.${ext}`);
    const { data } = await axios.post<{ text: string }>(`${BASE}/transcribe`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.text ?? '';
  },

  // ── D-ID WebRTC streaming ────────────────────────────────────────────────

  async createDIDStream(session_id: string, presenter_url?: string): Promise<DIDStreamData> {
    const { data } = await axios.post<DIDStreamData>(`${BASE}/did/create-stream`, {
      session_id,
      ...(presenter_url ? { presenter_url } : {}),
    });
    return data;
  },

  async uploadPresenterImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await axios.post<{ url: string }>(`${BASE}/did/upload-presenter`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  },

  async sendSdpAnswer(
    stream_id: string,
    session_id: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    await axios.post(`${BASE}/did/sdp-answer`, { stream_id, session_id, answer });
  },

  async sendIceCandidate(
    stream_id: string,
    session_id: string,
    candidate: RTCIceCandidate,
  ): Promise<void> {
    await axios.post(`${BASE}/did/ice`, {
      stream_id,
      session_id,
      candidate: candidate.candidate,
      sdp_mid: candidate.sdpMid ?? '',
      sdp_mline_index: candidate.sdpMLineIndex ?? 0,
    });
  },

  async speakText(stream_id: string, session_id: string, text: string): Promise<void> {
    await axios.post(`${BASE}/did/speak`, { stream_id, session_id, text });
  },

  async closeStream(stream_id: string, session_id: string): Promise<void> {
    await axios.delete(`${BASE}/did/stream/${stream_id}`, { params: { session_id } });
  },
};

export default interviewService;
