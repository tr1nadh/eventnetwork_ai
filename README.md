# 🚀 EventNetwork AI

> **AI-powered networking for offline events.**

EventNetwork AI helps attendees discover the **right people**, not just **more people**, at hackathons, conferences, meetups, and networking events using AI-powered semantic matching.

Instead of relying on random conversations, EventNetwork AI understands who attendees are, what they do, and who they are looking for, then recommends meaningful professional connections.

Built for **AMD Developer Hackathon – ACT II**.

---

# 🔗 Project Links

- 🌐 **Live Demo:** https://eventnetwork-ai.vercel.app
- 🎥 **Demo Video:** [Demo video](https://drive.google.com/file/d/1WYLzYtEHecC1oadmghmuyvCGWrg-26Yz/view?usp=sharing)
- 📊 **Presentation Slides:** [Pitch deck pdf](https://drive.google.com/file/d/1E1yVJJ5STX29A1F644AMbllMWhzJvD0A/view?usp=sharing)
- 💻 **GitHub Repository:** https://github.com/tr1nadh/eventnetwork-ai

---

# 📖 Problem

Every year, thousands of people attend hackathons, conferences, and networking events hoping to meet the right co-founder, mentor, recruiter, investor, or collaborator.

Unfortunately, networking is still largely based on luck. Attendees often leave without meeting the people who could have had the greatest impact on their careers.

EventNetwork AI transforms networking into an intelligent, AI-assisted experience by helping attendees discover meaningful professional connections before opportunities are missed.

---

# 🎯 Why EventNetwork AI?

Traditional networking apps rely on manual browsing and keyword searches.

EventNetwork AI combines **AI profile extraction**, **semantic participant matching**, **AI-generated networking insights**, and **real-time collaboration** to help attendees build meaningful professional relationships during offline events.

---

# ✨ Features

- 📅 Event Creation & Management
- 🗺️ Interactive 2D Venue Editor
- 🤖 AI Profile Auto-Fill
- 👤 AI Networking Profiles
- 🧠 Semantic AI Matching
- 💡 AI Match Analysis
- 🤝 Smart Connections
- 🔔 Real-Time Connection Notifications
- 💬 Real-Time Chat
- ✨ AI Meeting Prep
- 📊 Organizer Analytics Dashboard
- ⚡ Persisted Offline Svelte Stores
- 📱 Fully Responsive Modern UI

---

# 🗺️ Interactive 2D Venue

Each event includes an editable 2D venue layout.

Event organizers can visually customize venue blocks to represent booths, meeting areas, seating zones, or other spaces, giving attendees a better understanding of the event layout.

---

# 📸 Screenshots

> Replace these placeholders with actual screenshots before submission.

### Home

<img width="1344" height="600" alt="image" src="https://github.com/user-attachments/assets/d006f733-0e7d-4760-9f4f-e458fe54909d" />


### AI Matching

<img width="1346" height="591" alt="image" src="https://github.com/user-attachments/assets/e1e6e254-1b0e-4f27-b809-9daaeb3b6ded" />


### AI Meeting Prep

<img width="1355" height="591" alt="image" src="https://github.com/user-attachments/assets/35d1daca-4bc8-45c8-9f4b-4e4d474be846" />


### Organizer Analytics

<img width="1346" height="593" alt="image" src="https://github.com/user-attachments/assets/8f8f2809-8ca4-4e65-a799-3a0d312886e5" />


---

# 🏗️ Tech Stack

## Frontend

- SvelteKit
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

### Qwen3.7 Plus (Fireworks AI)

Used for:

- AI Profile Auto-Fill
- AI Match Analysis
- AI Meeting Prep

---

## Embeddings

### Qwen3 Embedding 8B

Used for:

- Semantic User Matching
- Similarity Search

---

## AI Infrastructure

- Fireworks AI
- AMD AI Ecosystem

---

# 🏛️ Architecture

```text
                     Fireworks AI
                     Qwen3.7 Plus
                           │
                           ▼
                AI Profile Auto-Fill
                           │
                           ▼
                 Qwen3 Embedding 8B
                           │
                           ▼
                 Semantic Match Engine
                           │
                           ▼
                  AI Match Analysis
                           │
                           ▼
                    Smart Connections
                           │
                           ▼
                    AI Meeting Prep
                           │
                           ▼
                     Real-Time Chat
                           │
                           ▼
                 Organizer Analytics
```

---

# ⚙️ How Matching Works

1. User joins an event.
2. User creates an AI networking profile.
3. Semantic embeddings are generated.
4. Similar participants are identified using vector similarity search.
5. AI generates personalized match explanations.
6. Users send connection requests.
7. Accepted connections unlock real-time chat.
8. AI Meeting Prep generates personalized conversation starters and collaboration opportunities.

---

# 📦 Project Structure

```text
src/
 ├── routes/
 ├── lib/
 ├── components/
 ├── stores/
 ├── server/
 ├── utils/
 └── app.html
```

---

# 🔥 Core Features

- AI-powered networking
- AI profile extraction
- Semantic participant matching
- AI match explanations
- AI Meeting Prep
- Smart connections
- Real-time notifications
- Real-time chat
- Interactive 2D venue editor
- Organizer analytics
- Modern responsive UI

---

# 🚀 Running Locally

## Install

```bash
npm install
```

---

## Configure Environment

Create a `.env` file.

```env
PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
FIREWORKS_MODEL=YOUR_FIREWORKS_MODEL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
FIREWORKS_API_KEY=YOUR_FIREWORKS_API_KEY
PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

---

## Run

```bash
npm run dev
```

---

# 🌐 Deployment

Deploy using:

- Vercel
- Netlify
- Node.js Server

---

# 🧪 AI Workflow

```text
Participant
      │
      ▼
AI Profile Auto-Fill
      │
      ▼
Generate Embeddings
      │
      ▼
Semantic Matching
      │
      ▼
AI Match Analysis
      │
      ▼
Send Connection
      │
      ▼
Accept Connection
      │
      ▼
AI Meeting Prep
      │
      ▼
Real-Time Chat
      │
      ▼
Meaningful Networking
```

---

# 📈 Future Enhancements

- Indoor navigation
- Calendar integration
- AI event recommendations
- Cross-event networking
- Organization pages
- Community networking
- Multi-event networking history

---

# 🛠️ AMD Compute Verification

Our application's AI pipelines were engineered, tested, and validated using the official AMD Jupyter Notebook compute environment.

- **Verification Script:** `/amd-compute-workspace/amd_verification.py`
- **Execution Log:** `/amd-compute-workspace/verification_log.txt`
- **Jupyter Notebook:** `/amd-compute-workspace/amd_verification.ipynb`

---

# 🏆 Hackathon Highlights

- Built for AMD Developer Hackathon ACT II
- AI-powered networking platform
- Semantic participant matching
- Fireworks AI integration
- Qwen3.7 Plus LLM
- Qwen3 Embedding 8B
- Supabase Realtime architecture
- Interactive 2D venue editor
- Modern AI-first user experience

---

# ❤️ Built For

**AMD Developer Hackathon – ACT II**

---

# 👨‍💻 Author

**Trinadh D**

---

# 📄 License

MIT License
