/**
 * AIInterviewerModal
 * Google Meet-style full-screen AI interview overlay.
 *
 * Features
 * ─────────
 * • D-ID WebRTC avatar; if unavailable, 2D avatar + ElevenLabs TTS (then browser TTS)
 * • OpenAI Whisper / Web Speech API voice recognition
 * • Real-time chat sidebar (slides in)
 * • Controls: mic mute/unmute · chat toggle · end call
 * • Matches SkillQuest theme (gold/amber + dark glass morphism)
 */
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  Box, IconButton, Tooltip, Typography, Fade,
  Chip, alpha, Slide, Paper,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ChatIcon from '@mui/icons-material/Chat';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SignalWifi4BarIcon from '@mui/icons-material/SignalWifi4Bar';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import interviewService, { ChatMessage, DIDStreamData } from '../services/interviewService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIInterviewerProps {
  open: boolean;
  domain: string;
  score: number;        // accuracy %
  correct: number;
  total: number;
  topicsMissed?: string[];
  onClose: () => void;  // called when interview ends
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

// ─── Animated Fallback Avatar ─────────────────────────────────────────────────

function FallbackAvatar({ isSpeaking, label = 'Alex · AI Interviewer' }: { isSpeaking: boolean; label?: string }) {
  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Animated background rings */}
      {isSpeaking && [1, 2, 3].map((i) => (
        <Box
          key={i}
          component={motion.div}
          animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          sx={{
            position: 'absolute',
            width: 180, height: 180, borderRadius: '50%',
            border: '2px solid rgba(201,162,39,0.5)',
          }}
        />
      ))}

      {/* Avatar circle */}
      <Box
        component={motion.div}
        animate={isSpeaking ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
        sx={{
          width: 160, height: 160, borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a227 0%, #8b6914 50%, #c9a227 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSpeaking
            ? '0 0 40px rgba(201,162,39,0.5), 0 0 80px rgba(201,162,39,0.2)'
            : '0 0 20px rgba(201,162,39,0.15)',
          position: 'relative', zIndex: 1,
        }}
      >
        <SmartToyIcon sx={{ fontSize: 72, color: '#141210' }} />
      </Box>

      {/* Name label */}
      <Box sx={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}>
        <Chip
          label={label}
          size="small"
          sx={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            color: '#e8e4df',
            fontWeight: 600,
            fontSize: '0.8rem',
            border: '1px solid rgba(255,255,255,0.12)',
            px: 0.5,
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Voice equaliser bars ─────────────────────────────────────────────────────

/** Wait until RTCPeerConnection reaches connected (reference AI Interviewer pattern). */
function waitForPeerConnected(pc: RTCPeerConnection, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pc.connectionState === 'connected') {
      resolve();
      return;
    }
    const t = setTimeout(() => {
      cleanup();
      reject(new Error('WebRTC connection timeout'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(t);
      pc.removeEventListener('connectionstatechange', onState);
    };
    const onState = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        cleanup();
        resolve();
      } else if (st === 'failed' || st === 'closed') {
        cleanup();
        reject(new Error(`WebRTC ${st}`));
      }
    };
    pc.addEventListener('connectionstatechange', onState);
    onState();
  });
}

function VoiceBars({ active }: { active: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 20 }}>
      {[4, 8, 12, 8, 4, 10, 6].map((h, i) => (
        <Box
          key={i}
          component={motion.div}
          animate={active ? { height: [4, h + Math.random() * 6, 4] } : { height: 4 }}
          transition={{ duration: 0.4 + i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
          sx={{ width: 3, borderRadius: 2, background: '#c9a227', minHeight: 4 }}
        />
      ))}
    </Box>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box
        sx={{
          display: 'flex', flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
          {!isUser && (
            <SmartToyIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
          )}
          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            {isUser ? 'You' : 'Alex'}
          </Typography>
          {isUser && (
            <PersonIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
          )}
        </Box>
        <Box
          sx={{
            maxWidth: '88%', px: 1.5, py: 1,
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isUser
              ? 'linear-gradient(135deg, rgba(201,162,39,0.25), rgba(139,105,20,0.2))'
              : 'rgba(255,255,255,0.07)',
            border: isUser
              ? '1px solid rgba(201,162,39,0.3)'
              : '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.88rem', lineHeight: 1.6,
              color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
            }}
          >
            {msg.text}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIInterviewerModal({
  open, domain, score, correct, total, topicsMissed = [], onClose,
}: AIInterviewerProps) {
  // Session state
  const [sessionId,      setSessionId]      = useState('');
  const [messages,       setMessages]       = useState<DisplayMessage[]>([]);
  const [history,        setHistory]        = useState<ChatMessage[]>([]);
  const [chatInput,      setChatInput]      = useState('');
  const [chatOpen,       setChatOpen]       = useState(true);
  const [isMuted,        setIsMuted]        = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [isThinking,     setIsThinking]     = useState(false);
  const [status,         setStatus]         = useState<'init' | 'connecting' | 'live' | 'ending'>('init');
  const [elapsed,        setElapsed]        = useState(0);
  const [transcript,     setTranscript]     = useState('');
  const [didUnavailable, setDidUnavailable] = useState(false);
  /** True once <video> can play frames (reference uses onCanPlay for fade-in). */
  const [videoLive, setVideoLive] = useState(false);

  // D-ID WebRTC refs — didReadyRef avoids stale closure in avatarSpeak (reference pattern)
  const didReadyRef    = useRef(false);
  const didStreamRef   = useRef<DIDStreamData | null>(null);
  const peerConnRef    = useRef<RTCPeerConnection | null>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  /** ElevenLabs / browser TTS playback when D-ID is off */
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Speech recognition ref
  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const mediaRecRef     = useRef<MediaRecorder | null>(null);
  const audioChunksRef  = useRef<Blob[]>([]);

  // Chat scroll
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addMessage = useCallback((role: ChatMessage['role'], text: string) => {
    const msg: DisplayMessage = { id: `${Date.now()}-${Math.random()}`, role, text, ts: Date.now() };
    setMessages(prev => [...prev, msg]);
    setHistory(prev => [...prev, { role, content: text }]);
    return msg;
  }, []);

  // Browser TTS when D-ID and ElevenLabs are unavailable
  const speakBrowserTts = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha'))
      ?? voices[0];
    if (preferred) utt.voice = preferred;
    utt.rate = 1.05;
    utt.pitch = 1.0;
    utt.onstart  = () => setIsSpeaking(true);
    utt.onend    = () => setIsSpeaking(false);
    utt.onerror  = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utt);
  }, []);

  const stopFallbackAudio = useCallback(() => {
    const a = fallbackAudioRef.current;
    if (a) {
      a.pause();
      a.src = '';
      fallbackAudioRef.current = null;
    }
  }, []);

  /** ElevenLabs (server) then browser speech synthesis */
  const speakWithFallbackVoice = useCallback(async (text: string) => {
    stopFallbackAudio();
    window.speechSynthesis?.cancel();
    const blob = await interviewService.speakTTS(text);
    if (!blob || blob.size === 0) {
      speakBrowserTts(text);
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    fallbackAudioRef.current = audio;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      if (fallbackAudioRef.current === audio) fallbackAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      if (fallbackAudioRef.current === audio) fallbackAudioRef.current = null;
      speakBrowserTts(text);
    };
    try {
      await audio.play();
    } catch {
      URL.revokeObjectURL(url);
      fallbackAudioRef.current = null;
      speakBrowserTts(text);
    }
  }, [speakBrowserTts, stopFallbackAudio]);

  // ── D-ID WebRTC setup ──────────────────────────────────────────────────────

  const setupDIDStream = useCallback(async (sessionIdForDid: string) => {
    didReadyRef.current = false;
    setVideoLive(false);
    try {
      const streamData = await interviewService.createDIDStream(sessionIdForDid);
      didStreamRef.current = streamData;

      const iceServers = (streamData.ice_servers?.length ? streamData.ice_servers : [{ urls: 'stun:stun.l.google.com:19302' }]) as RTCIceServer[];

      const pc = new RTCPeerConnection({ iceServers });
      peerConnRef.current = pc;

      pc.addEventListener('track', (event) => {
        const [stream] = event.streams;
        const el = avatarVideoRef.current;
        if (el && stream) {
          el.srcObject = stream;
          el.play().catch(() => {});
        }
      });

      pc.addEventListener('icecandidate', async (event) => {
        if (event.candidate && didStreamRef.current) {
          try {
            await interviewService.sendIceCandidate(
              didStreamRef.current.stream_id,
              didStreamRef.current.session_id,
              event.candidate,
            );
          } catch { /* ignore */ }
        }
      });

      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'connected') setStatus('live');
        if (pc.connectionState === 'failed') {
          setDidUnavailable(true);
          setVideoLive(false);
          didReadyRef.current = false;
        }
      });

      const raw = streamData.offer as RTCSessionDescriptionInit & { sdp?: string };
      const offer: RTCSessionDescriptionInit = typeof raw === 'string'
        ? { type: 'offer', sdp: raw }
        : { type: (raw?.type as RTCSdpType) || 'offer', sdp: raw?.sdp || '' };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await interviewService.sendSdpAnswer(
        streamData.stream_id,
        streamData.session_id,
        answer,
      );

      await waitForPeerConnected(pc);
      didReadyRef.current = true;
    } catch {
      didReadyRef.current = false;
      setDidUnavailable(true);
      setVideoLive(false);
    }
  }, []);

  // ── Avatar speak ───────────────────────────────────────────────────────────
  //
  // IMPORTANT: only use refs here — never the didUnavailable *state* value.
  // avatarSpeak is called inside async functions (initSession, sendMessage)
  // that captured a stale closure snapshot. Reading the state variable would
  // give the value from the render cycle when the callback was created, NOT
  // the current value. Refs are always up-to-date regardless of closure age.

  const avatarSpeak = useCallback(async (text: string) => {
    if (didReadyRef.current && didStreamRef.current) {
      try {
        setIsSpeaking(true);
        await interviewService.speakText(
          didStreamRef.current.stream_id,
          didStreamRef.current.session_id,
          text,
        );
        const words = text.split(' ').length;
        setTimeout(() => setIsSpeaking(false), Math.max(2000, words * 350));
        return; // D-ID handled it — never fall through to ElevenLabs
      } catch {
        // D-ID speak API failed — mark unavailable so the 2D avatar shows
        didReadyRef.current = false;
        setDidUnavailable(true);
        setVideoLive(false);
        setIsSpeaking(false);
        // fall through to ElevenLabs / browser TTS below
      }
    }
    // Only reaches here when D-ID is genuinely down (ref says so)
    await speakWithFallbackVoice(text);
  }, [speakWithFallbackVoice]);

  // ── Session init ───────────────────────────────────────────────────────────

  const initSession = useCallback(async () => {
    setStatus('connecting');
    try {
      const resp = await interviewService.startInterview({
        domain, score, correct, total, topics_missed: topicsMissed,
      });
      setSessionId(resp.session_id);

      await setupDIDStream(resp.session_id);
      setStatus('live');
      addMessage('assistant', resp.greeting);
      addMessage('assistant', resp.first_question);
      await avatarSpeak(`${resp.greeting} ${resp.first_question}`);
    } catch {
      setStatus('live');
      const fallback = `Hi! I'm Alex. I saw you just wrapped up the ${domain} rapid-fire round. Let's dig in — can you explain the concept you found most challenging?`;
      addMessage('assistant', fallback);
      avatarSpeak(fallback);
      setDidUnavailable(true);
    }
  }, [domain, score, correct, total, topicsMissed, addMessage, setupDIDStream, avatarSpeak]);

  useEffect(() => {
    if (!open) {
      didReadyRef.current = false;
      peerConnRef.current?.close();
      peerConnRef.current = null;
      didStreamRef.current = null;
      if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;
      return undefined;
    }

    setElapsed(0);
    setVideoLive(false);
    didReadyRef.current = false;
    setDidUnavailable(false);
    setMessages([]);
    setHistory([]);
    setChatInput('');
    setSessionId('');
    setStatus('init');

    initSession();
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    timerRef.current = id;

    return () => {
      clearInterval(id);
      window.speechSynthesis?.cancel();
      fallbackAudioRef.current?.pause();
      fallbackAudioRef.current = null;
      recognitionRef.current?.abort();
      mediaRecRef.current?.stop();
      peerConnRef.current?.close();
      peerConnRef.current = null;
      didStreamRef.current = null;
      if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount via key from parent resets state
  }, [open]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (status !== 'live' || !text.trim() || isThinking) return;
    const userText = text.trim();
    setChatInput('');
    setTranscript('');
    addMessage('user', userText);
    setIsThinking(true);

    try {
      const resp = await interviewService.chat(sessionId, userText, history, domain, score);
      addMessage('assistant', resp.reply);
      setIsThinking(false);
      await avatarSpeak(resp.reply);
      if (resp.is_closing) {
        setTimeout(() => handleEnd(), 4000);
      }
    } catch {
      setIsThinking(false);
      const err = "I didn't catch that — could you repeat?";
      addMessage('assistant', err);
      avatarSpeak(err);
    }
  }, [status, isThinking, sessionId, history, domain, score, addMessage, avatarSpeak]);

  // ── End interview ──────────────────────────────────────────────────────────

  const handleEnd = useCallback(async () => {
    setStatus('ending');
    didReadyRef.current = false;
    clearInterval(timerRef.current);
    window.speechSynthesis?.cancel();
    fallbackAudioRef.current?.pause();
    fallbackAudioRef.current = null;
    recognitionRef.current?.abort();
    mediaRecRef.current?.stop();

    if (didStreamRef.current) {
      try {
        await interviewService.closeStream(
          didStreamRef.current.stream_id,
          didStreamRef.current.session_id,
        );
      } catch { /* ignore */ }
    }
    peerConnRef.current?.close();

    setTimeout(onClose, 500);
  }, [onClose]);

  // ── Web Speech API ─────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // Fallback: MediaRecorder → Whisper
      startMediaRecorder();
      return;
    }
    const rec = new SR() as SpeechRecognition;
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      const last = Array.from(e.results).pop();
      if (!last) return;
      const t = last[0].transcript;
      setTranscript(t);
      if (last.isFinal) {
        sendMessage(t);
        setIsListening(false);
      }
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [sendMessage]);

  const startMediaRecorder = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        try {
          const text = await interviewService.transcribeAudio(blob, 'audio/webm');
          if (text) sendMessage(text);
        } catch { /* ignore */ }
        setIsListening(false);
      };
      mr.start();
      mediaRecRef.current = mr;
      setIsListening(true);
    }).catch(() => setIsListening(false));
  }, [sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    mediaRecRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleMicPress = useCallback(() => {
    if (isMuted) { setIsMuted(false); return; }
    if (isListening) { stopListening(); } else { startListening(); }
  }, [isMuted, isListening, startListening, stopListening]);

  // Format elapsed time
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!open) return null;

  /** Chat list and send only after stream setup + first lines are committed (status is live). */
  const sessionReady = status === 'live' || status === 'ending';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Fade in={open}>
      <Box
        sx={{
          position: 'fixed', inset: 0, zIndex: 1400,
          background: '#0a0a0c',
          display: 'flex', flexDirection: 'column',
          fontFamily: '"DM Sans", system-ui, sans-serif',
        }}
      >
        {/* ── Top bar ── */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: { xs: 2, md: 4 }, py: 1.5,
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: '20px',
              background: 'rgba(201,162,39,0.12)',
              border: '1px solid rgba(201,162,39,0.3)',
              display: 'flex', alignItems: 'center', gap: 0.8,
            }}>
              <SmartToyIcon sx={{ fontSize: 15, color: '#c9a227' }} />
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#c9a227', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                AI Interview
              </Typography>
            </Box>
            <Chip
              label={domain}
              size="small"
              sx={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Live indicator */}
            {status === 'live' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <FiberManualRecordIcon
                  component={motion.svg as any}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  sx={{ fontSize: 10, color: '#ef4444' }}
                />
                <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                  LIVE
                </Typography>
              </Box>
            )}
            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(elapsed)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SignalWifi4BarIcon sx={{ fontSize: 15, color: '#10b981' }} />
            </Box>
          </Box>
        </Box>

        {/* ── Main area ── */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Avatar panel */}
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* D-ID Video element (hidden if unavailable) */}
            <video
              ref={avatarVideoRef}
              autoPlay
              playsInline
              muted={false}
              onCanPlay={() => setVideoLive(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: didUnavailable ? 'none' : 'block',
                opacity: videoLive ? 1 : 0,
                transition: 'opacity 0.45s ease',
                background: '#0a0a0c',
              }}
            />

            {/* Fallback when D-ID fails or no API key */}
            {didUnavailable && (
              <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <FallbackAvatar isSpeaking={isSpeaking} label="Alex · 2D interviewer" />
              </Box>
            )}

            {/* Placeholder while D-ID WebRTC connects */}
            {!didUnavailable && !videoLive && (
              <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <FallbackAvatar isSpeaking={isSpeaking} />
                <Box sx={{
                  position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
                  px: 2, py: 1, borderRadius: '12px',
                  background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(201,162,39,0.35)',
                }}>
                  <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                    Connecting D-ID avatar…
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Session / LLM connecting */}
            {status === 'connecting' && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,10,12,0.55)', backdropFilter: 'blur(4px)',
                pointerEvents: 'none',
              }}>
                <Box
                  component={motion.div}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  sx={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: '2px solid rgba(201,162,39,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                  }}
                >
                  <SmartToyIcon sx={{ color: '#c9a227', fontSize: 30 }} />
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 500 }}>
                  Starting session…
                </Typography>
              </Box>
            )}

            {/* Thinking bubble */}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}
                >
                  <Box sx={{
                    px: 2, py: 1, borderRadius: '20px',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}>
                    {[0, 1, 2].map(i => (
                      <Box
                        key={i}
                        component={motion.div}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        sx={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a227' }}
                      />
                    ))}
                    <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', ml: 0.5 }}>
                      Alex is thinking…
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User mic indicator (bottom-left corner) */}
            <Box sx={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 3,
              px: 1.5, py: 0.8, borderRadius: '12px',
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <PersonIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                You
              </Typography>
              {isListening && <VoiceBars active={isListening} />}
              {isMuted && <MicOffIcon sx={{ fontSize: 13, color: '#ef4444' }} />}
            </Box>

            {/* Live transcript badge */}
            <AnimatePresence>
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 3, maxWidth: '70%' }}
                >
                  <Box sx={{
                    px: 2, py: 1, borderRadius: '12px',
                    background: 'rgba(201,162,39,0.12)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(201,162,39,0.3)',
                  }}>
                    <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                      "{transcript}"
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* ── Chat sidebar ── */}
          <Slide direction="left" in={chatOpen} mountOnEnter unmountOnExit>
            <Paper
              elevation={0}
              sx={{
                width: { xs: '100%', sm: 340 },
                maxWidth: '90vw',
                display: 'flex', flexDirection: 'column',
                background: 'rgba(10,10,14,0.85)',
                backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 0,
                flexShrink: 0,
              }}
            >
              {/* Chat header */}
              <Box sx={{
                px: 2, py: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <ChatIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                  In-call messages
                </Typography>
                <Box sx={{ ml: 'auto', px: 1, py: 0.3, borderRadius: '8px', background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.25)' }}>
                  <Typography sx={{ fontSize: '0.65rem', color: '#c9a227', fontWeight: 700 }}>
                    {sessionReady ? messages.length : 0}
                  </Typography>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
                {!sessionReady ? (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, opacity: 0.45 }}>
                    <ChatIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.25)' }} />
                    <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                      Starting interview…
                    </Typography>
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, opacity: 0.4 }}>
                    <ChatIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.3)' }} />
                    <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                      Your conversation will appear here
                    </Typography>
                  </Box>
                ) : (
                  messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                )}
                {sessionReady && isThinking && (
                  <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', mb: 1, ml: 0.5 }}>
                    {[0, 1, 2].map(i => (
                      <Box
                        key={i}
                        component={motion.div}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.13 }}
                        sx={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }}
                      />
                    ))}
                  </Box>
                )}
                <div ref={chatEndRef} />
              </Box>

              {/* Text input */}
              <Box sx={{
                px: 2, pb: 2, pt: 1,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', px: 1.5, py: 0.5,
                  '&:focus-within': { borderColor: 'rgba(201,162,39,0.45)' },
                  transition: 'border-color 0.15s',
                }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                    placeholder={status === 'live' ? 'Type a message…' : 'Interview starting…'}
                    disabled={status !== 'live'}
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem',
                      fontFamily: 'inherit', padding: '6px 0',
                      opacity: status === 'live' ? 1 : 0.45,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => sendMessage(chatInput)}
                    disabled={status !== 'live' || !chatInput.trim() || isThinking}
                    sx={{
                      color: chatInput.trim() ? '#c9a227' : 'rgba(255,255,255,0.25)',
                      '&:hover': { background: 'rgba(201,162,39,0.12)' },
                      transition: 'color 0.15s',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Slide>
        </Box>

        {/* ── Bottom control bar ── */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: { xs: 2, md: 3 }, py: 2.5,
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Score badge (left) */}
          <Box sx={{ position: 'absolute', left: { xs: 16, md: 32 }, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${score.toFixed(0)}% accuracy`}
              size="small"
              sx={{
                background: score >= 70 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: score >= 70 ? '#10b981' : '#ef4444',
                fontWeight: 600, fontSize: '0.72rem',
                border: `1px solid ${score >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            />
          </Box>

          {/* Mic / Mute button */}
          <Tooltip
            title={isMuted ? 'Unmute mic' : isListening ? 'Stop & send' : 'Hold to speak'}
            placement="top"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8 }}>
              <IconButton
                onClick={handleMicPress}
                sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: isMuted
                    ? '#ef4444'
                    : isListening
                    ? 'rgba(201,162,39,0.22)'
                    : 'rgba(255,255,255,0.08)',
                  border: isMuted
                    ? '2px solid #ef4444'
                    : isListening
                    ? '2px solid rgba(201,162,39,0.7)'
                    : '2px solid rgba(255,255,255,0.15)',
                  color: isMuted ? '#fff' : isListening ? '#c9a227' : 'rgba(255,255,255,0.85)',
                  '&:hover': {
                    background: isMuted ? '#dc2626' : isListening ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.14)',
                  },
                  transition: 'all 0.15s',
                  boxShadow: isListening ? '0 0 20px rgba(201,162,39,0.35)' : 'none',
                }}
              >
                {isMuted
                  ? <MicOffIcon />
                  : isListening
                  ? (
                    <Box component={motion.div} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                      <MicIcon />
                    </Box>
                  )
                  : <MicIcon />
                }
              </IconButton>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                {isMuted ? 'Unmute' : isListening ? 'Recording…' : 'Mic'}
              </Typography>
            </Box>
          </Tooltip>

          {/* Chat toggle */}
          <Tooltip title={chatOpen ? 'Close chat' : 'Open chat'} placement="top">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8 }}>
              <IconButton
                onClick={() => setChatOpen(o => !o)}
                sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: chatOpen ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${chatOpen ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  color: chatOpen ? '#c9a227' : 'rgba(255,255,255,0.6)',
                  '&:hover': { background: chatOpen ? 'rgba(201,162,39,0.22)' : 'rgba(255,255,255,0.1)' },
                }}
              >
                <ChatIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                Chat
              </Typography>
            </Box>
          </Tooltip>

          {/* End call */}
          <Tooltip title="End interview" placement="top">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8 }}>
              <IconButton
                onClick={handleEnd}
                sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.15)',
                  border: '2px solid rgba(239,68,68,0.5)',
                  color: '#ef4444',
                  '&:hover': {
                    background: '#ef4444',
                    color: '#fff',
                    boxShadow: '0 0 24px rgba(239,68,68,0.4)',
                  },
                  transition: 'all 0.15s',
                }}
              >
                <CallEndIcon />
              </IconButton>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                End
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Fade>
  );
}
