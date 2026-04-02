# AI Expense Tracker

Full-stack starter for an AI expense tracker.

## Structure

- `backend/` Node.js, Express, TypeScript, SQLite
- `mobile/` Expo React Native, TypeScript, router-based navigation

## Setup

- Backend: `cd backend && npm install && npm run dev`
- Mobile: `cd mobile && npm install && npm start`
# 💰 AI Expense Tracker

A full-stack mobile app that lets you log expenses using **natural language** — no forms, no dropdowns. Just type what you spent and AI handles the rest.

Built by: **Mohak**  
Time to build: ~1.5 hours (with AI assistance)  
Stack: React Native · Node.js · SQLite · Groq (LLaMA 3.1)

---

## 🎥 Demo

> Add a screen recording link here after recording

**What it does:**
- "Spent 850 on lunch with client at Taj" → ₹850, 🍔 Food & Dining, Merchant: Taj
- "Uber to airport 450" → ₹450, 🚗 Transport, Merchant: Uber
- "Netflix 649" → ₹649, 📺 Entertainment, Merchant: Netflix
- "coffee" → ❌ Error: no amount detected

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) |
| AI | Groq API (LLaMA 3.1 70B) — free tier |

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- A free [Groq API key](https://console.groq.com)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Open .env and add your GROQ_API_KEY
npm run dev
```

Server starts at `http://localhost:3000`

Verify: `curl http://localhost:3000/health`

### Mobile

```bash
cd mobile
npm install
cp .env.example .env
# If using physical device, update EXPO_PUBLIC_API_URL to your local IP
npm start
```

Scan the QR code with **Expo Go** app (iOS/Android).

> **Physical device tip:** Replace `localhost` in `.env` with your machine's IP  
> (find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

---

## 📁 Project Structure

```
ai-expense-tracker/
├── backend/
│   └── src/
│       ├── index.ts              # Express server entry
│       ├── routes/expenses.ts   # REST API endpoints
│       ├── services/aiService.ts # AI parsing (Groq/OpenAI/Anthropic)
│       └── database/db.ts       # SQLite CRUD operations
│
├── mobile/
│   ├── App.tsx
│   └── src/
│       ├── screens/ExpenseTrackerScreen.tsx  # Main UI
│       ├── components/
│       │   ├── ExpenseItem.tsx   # Individual expense card
│       │   └── SuccessCard.tsx   # Post-add success feedback
│       ├── services/api.ts       # HTTP client with timeout
│       └── types/index.ts        # Shared TypeScript interfaces
│
└── README.md
```

---

## 🤖 AI Prompt Design

**System prompt used for expense parsing:**

```
You are an expense parser. Extract expense information from natural language input.

RULES:
1. Extract the amount as a number (no currency symbols)
2. Default currency is INR unless explicitly mentioned
3. Categorize into EXACTLY one of: Food & Dining, Transport, Shopping,
   Entertainment, Bills & Utilities, Health, Travel, Other
4. Description should be a clean summary (not the raw input)
5. Merchant is the company/store name if mentioned, null otherwise

RESPOND ONLY WITH VALID JSON...
```

**Why this approach:**  
Forcing JSON-only output eliminates parsing complexity. Strict category enumeration prevents hallucinated categories. Setting `temperature: 0.1` ensures consistent, deterministic outputs — critical for a financial app.

---

## ⏱️ Time Breakdown

| Task | Time |
|------|------|
| Project setup + config | 8 min |
| Database schema + CRUD | 6 min |
| AI integration service | 12 min |
| Backend API endpoints | 10 min |
| React Native UI | 28 min |
| Testing + debugging | 12 min |
| README + polish | 10 min |
| **Total** | **~1.5 hours** |

---

## 🔮 What I'd Add With More Time

- [ ] Monthly spend summary with category breakdown chart
- [ ] Budget alerts (notify when a category exceeds limit)
- [ ] Export to CSV / WhatsApp share
- [ ] Edit expense functionality
- [ ] Offline support with sync queue
- [ ] Auth (multi-user support)

---

## 🤖 AI Tools Used

- **Claude (claude.ai):** Architecture planning, full code generation for backend and mobile components, prompt engineering for the AI parser
- **Groq API (LLaMA 3.1 70B):** Runtime expense text classification

**Most helpful prompt:**  
*"Create a TypeScript Express route that receives natural language text, calls an AI parser service, validates the response, saves to SQLite, and returns structured JSON — with proper error handling and HTTP status codes"*

---

## 📜 License

MIT — use this freely for your own projects!
