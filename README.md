# 🚀 EventNetwork AI

> AI-powered networking for offline events.

EventNetwork AI helps attendees discover the **right people**, not just **more people**, at hackathons, conferences, meetups, and networking events using semantic AI matching.

Instead of relying on random conversations, EventNetwork AI understands who attendees are, what they do, and who they are looking for, then recommends meaningful professional connections.

Built for **AMD Developer Hackathon - ACT II**.

---

## 📖 Problem

Attendees spend hours at networking events but often fail to meet the people who could become their:

- Co-founder
- Mentor
- Recruiter
- Investor
- Collaborator

Traditional networking depends on luck.

EventNetwork AI transforms networking into an intelligent, AI-assisted experience.

---

# ✨ Features

## 🤖 AI Profile Auto-Fill

Users can simply paste:

- LinkedIn Summary
- Resume
- About Me
- Free-form text

Our AI automatically extracts structured networking information and fills the networking profile.

---

## 🧠 Semantic AI Matching

Instead of keyword matching, EventNetwork AI generates embeddings to understand:

- Who a participant is
- What they do
- Who they're looking for

Participants receive intelligent recommendations based on semantic similarity.

---

## 💡 AI Match Insights

Every recommended match includes an AI-generated explanation describing:

- Why the two participants matched
- Shared interests
- Collaboration opportunities

---

## 🤝 Smart Connections

Participants can:

- Send connection requests
- Accept requests
- Reject requests
- Cancel requests

Connection updates happen in real time.

---

## 💬 Real-Time Chat

Accepted connections can chat instantly during the event.

Built using Supabase Realtime.

---

## ✨ AI Meeting Prep

Before meeting, AI generates:

- Personalized conversation starters
- Questions to ask
- Collaboration opportunities

Helping attendees break the ice naturally.

---

## 📱 QR Meet Confirmation

After meeting in person:

Participants scan each other's QR code.

The platform marks the connection as **Met**.

---

## 📊 Organizer Analytics

Organizers receive insights including:

- Participants
- AI Matches
- Connection Requests
- Accepted Connections
- People Met
- Networking Funnel
- Top Skills
- Networking Goals

Helping measure the success of the event.

---

# 🏗️ Tech Stack

## Frontend

- SvelteKit
- TypeScript
- Tailwind CSS
- Shadcn Svelte

## Backend

- SvelteKit API Routes

## Database

- Supabase PostgreSQL
- pgvector
- Supabase Realtime

## Authentication

- Google OAuth
- Supabase Auth

---

# 🧠 AI Stack

## LLM

**Qwen3.7 Plus** (Fireworks AI)

Used for:

- AI Profile Auto-Fill
- AI Match Analysis
- AI Meeting Prep

---

## Embeddings

**Qwen3 Embedding 8B**

Used for:

- Semantic User Matching
- Similarity Search

---

## AI Infrastructure

- Fireworks AI
- AMD AI Ecosystem

---

# ⚙️ How Matching Works

1. User creates a networking profile.
2. Profile embeddings are generated.
3. Semantic similarity search identifies relevant participants.
4. AI generates personalized match explanations.
5. Users connect.
6. AI prepares conversation starters.
7. Users meet and confirm using QR codes.

---

# 📦 Project Structure

```
src/
 ├── routes/
 ├── lib/
 ├── components/
 ├── stores/
 ├── server/
 └── utils/
```

---

# 🔥 Core Features

- AI-powered networking
- Semantic search
- AI profile extraction
- AI match explanations
- AI Meeting Prep
- Real-time connection requests
- Real-time chat
- QR meet confirmation
- Organizer analytics
- Modern responsive UI

---

# 🚀 Running Locally

## Install

```bash
npm install
```

## Configure Environment

Create a `.env` file.

Example:

```env
PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

FIREWORKS_API_KEY=YOUR_FIREWORKS_API_KEY
```

---

## Run

```bash
npm run dev
```

---

# 🌐 Deployment

The application can be deployed on:

- Vercel
- Netlify
- Node.js Server

---

# 🧪 AI Workflow

```
Participant
      │
      ▼
AI Profile Auto-Fill
      │
      ▼
Generate Embeddings
      │
      ▼
Semantic Match Search
      │
      ▼
AI Match Analysis
      │
      ▼
Connect
      │
      ▼
AI Meeting Prep
      │
      ▼
Real-Time Chat
      │
      ▼
Meet
```

---

# 📈 Future Enhancements

- Indoor venue location sharing
- Calendar integration
- Multi-event networking
- AI event recommendations
- Organization pages
- Community networking
- Cross-event professional network

---

## 🛠️ AMD Compute Verification
Our application’s AI pipelines were engineered, tested, and validated using the official AMD Jupyter Notebook compute environment. 
- **Verification Script:** `/amd-compute-workspace/amd_verification.py`
- **Execution Log:** `/amd-compute-workspace/verification_log.txt`
- **Jupyter Notebook:** `/amd-compute-workspace/amd_verification.ipynb`

---

# ❤️ Built For

AMD Developer Hackathon - ACT II

---

# 👨‍💻 Author

Trinadh D

---

# 📄 License

MIT License