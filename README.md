# SkillQuest 🎯
### Turn Practice into Progress

> SkillQuest is a full-stack developer upskilling platform that combines adaptive AI quizzes, a gamification engine, and a live AI interviewer to make learning structured, engaging, and measurable.

---

### ✨ Core Features

#### 🎯 Adaptive Learning
Questions dynamically adjust across four difficulty tiers — easy → intermediate → pro → mastery — based on your performance and response behavior.

#### 🏆 Gamification Engine
Earn XP, maintain streaks, level up, unlock achievements, and climb the leaderboard. Skill tree nodes unlock progressively per domain.

#### 📊 Learning Analytics
Per-topic accuracy, attempt summaries, domain-level success rates, and AI-powered next-topic recommendations.

#### 🤖 Live AI Interviewer
A 3-tier fallback interview experience:
1. **D-ID WebRTC Avatar** — realtime streaming with SDP/ICE negotiation
2. **ElevenLabs 2D Avatar TTS** — activated when D-ID is unavailable
3. **Browser Native Speech Synthesis** — ensures 100% uptime
Speech-to-text input enables a real interview feel.

---

### 👥 Who Is It For?

| Audience | Use Case |
|---|---|
| 👨‍💻 Junior Developers | Build structured knowledge paths across React, FastAPI, SQL & more |
| 🔄 Career Switchers | Enter tech from non-CS backgrounds with guided skill trees |
| 🎓 CS Students | Prepare for placements and internships with adaptive quizzes and AI mock interviews |
| 🏢 Engineering Teams | Identify knowledge gaps and assess team readiness via leaderboard analytics |
| ⚡ Rapid-Fire Learners | Speed-mode quizzes for focused 10-minute, streak-rewarding learning sprints |

---

### 🛠 Technical Stack

#### Frontend
| Technology | Role |
|---|---|
| React 18 + TypeScript | UI Layer |
| Vite | Build Tool |
| Material UI (MUI) | Component Library |
| Zustand | State Management |
| Framer Motion | Animations |
| Recharts | Analytics Charts |
| Axios | HTTP Client |

#### Backend
| Technology | Role |
|---|---|
| FastAPI | API Framework |
| SQLAlchemy (async) | ORM |
| SQLite / PostgreSQL | Database |
| Pydantic | Validation / Settings |
| Redis | Leaderboard / Cache |
| JWT Auth | Bearer Token |
| Uvicorn | ASGI Server |

---

### 🤖 AI & Media Integrations

| Service | Role |
|---|---|
| 🦙 Ollama (Local LLM) | Primary quiz & interview question generation. Privacy-first, offline-capable |
| 🤖 OpenAI API | Chat completion fallback + Whisper ASR for voice-to-text |
| 🎭 D-ID | Primary WebRTC avatar with realtime streaming |
| 🔊 ElevenLabs TTS | Fallback 2D avatar voice synthesis (returns audio/mpeg) |

---

### 🔄 Quiz Flow

```
User visits /quiz/:topic
        ↓
GET /api/quiz/topic — Backend checks QUESTION_POOL_FIRST flag
        ↓
  Pool Hit → Serve from Question Pool (fast)
  Pool Miss → Try Ollama LLM → OpenAI API Fallback
        ↓
Question delivered to Frontend (easy / intermediate / pro / mastery)
        ↓
POST /api/quiz/submit-answer → Evaluate + Award XP + Update Streak & Analytics
        ↓
Next Question (adaptive difficulty) OR Rapid-Fire Complete → AI Interview
```

---

### 🎤 AI Interview Flow

```
Rapid-Fire Complete → Trigger Interviewer
        ↓
POST /api/interview/start → Returns sessionId + greeting + first question
        ↓
Frontend attempts D-ID WebRTC stream setup (SDP + ICE)
        ↓
  D-ID OK  → Realtime WebRTC Avatar
  D-ID Fail → ElevenLabs TTS (2D Avatar) → Browser Speech Synthesis
        ↓
Question delivered (easy / intermediate / pro / mastery)
        ↓
POST /api/interview/chat → Continue conversation (detects INTERVIEW_COMPLETE token)
        ↓
Session Complete → Analytics Updated → XP Awarded 🎉
```

---

### 🏗 System Architecture

```
Browser / React (Vite · MUI · Zustand)
        ↓ API proxy
FastAPI Backend (:8000 · Uvicorn · JWT)
        ↓
┌─────────────────────────────────────────────┐
│  SQLite/Postgres   Redis       ML Module    │
│  SQLAlchemy ORM    Cache/LB    Adaptive AI  │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│  Ollama   OpenAI      D-ID      ElevenLabs  │
│  Local    GPT+Whisper WebRTC    TTS Fallback│
└─────────────────────────────────────────────┘

API Routes:
  /api/quiz       → Adaptive Q&A
  /api/interview  → AI Conversation
  /api/game       → XP + Leaderboard
  /api/skills     → Skill Tree + Progress
  /api/users      → Profile + Analytics
```
