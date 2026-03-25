# Demo script — “Talk to the Duck” (3–5 minutes)

Use this as a **read-aloud** script. It’s designed to hit the rubric: **real person + friction**, **usefulness**, **technical execution**, **creative interpretation**, **Cursor leverage**, and **storytelling**.

---

## 0) One sentence (10 seconds)

“**Talk to the Duck** is a voice-first journal that turns ‘I’ll remember this later’ into a searchable, organized memory — with a **tree** from **year → month → day → entry**, down to the **audio + transcript**.”

---

## 1) The person + the hard day (30–45 seconds)

“This is for a person who has a hard day that looks normal from the outside — a student, a founder, anyone who’s juggling emotional load and a lot of context switching.”

“The friction we saw is small-but-constant:
- They *do* process their day out loud — voice notes, quick rants, little reflections.
- But those notes become **lost**: scattered across apps, unnamed, unsearchable, and impossible to revisit when they actually need them.”

“So the hard day isn’t just ‘today is stressful’ — it’s also **tomorrow**, when you can’t retrieve what you already thought through.”

---

## 2) What we built (20–30 seconds)

“We built a simple flow:
- You **press and talk**.
- The app **stores the audio**, transcribes it, and generates a quick summary + emotion signal.
- Then it makes retrieval easy: **browse like a tree** (year/month/day) or **search** across everything.”

---

## 3) Live demo (2–3 minutes)

### A) Record (45–60 seconds)

Action (Web UI):
- Go to **Record** (`/record`)
- Press the **duck mic button**
- Say a short entry (10–15 seconds), e.g.:

“Today was heavy. I had three deadlines, and I keep replaying that difficult conversation. One good thing: I finally booked the appointment and asked for help.”

Say:
“This is the core: I don’t have to type. I just speak. When I stop recording, it uploads and saves the thought so it can’t vanish.”

Optional callout (if asked about reliability):
“Audio is stored server-side (volume-backed), and the entry is persisted with metadata so it’s recoverable.”

### B) Verify it’s not ‘just a voice note’ (30–45 seconds)

Action:
- Click into **History** (`/history`) and open today.
- Open an entry detail (`/entries/:id`) if needed.

Say:
“Here’s the proof it’s not a pile of recordings:
- We keep the **audio** you said.
- We generate **text you can scan** (transcript/clean text).
- We generate a **human-sized summary** so you can navigate and retrieve recordings later.”

### C) Retrieval as a tree (year → month → day) (45–60 seconds)

Action:
- Go to **Calendar Insights** (`/calendar`)
- Start at **Year**
- Click a **Month**, then click a **Day**
- Use “View all recordings for this day”

Say:
“This is the ‘nothing gets forgotten’ part. When you come back later, you don’t start from a giant list. You start at the top:
- **Year summary**: what mattered overall
- **Month summary**: what was going on in that period
- **Day**: jump straight to the exact recordings”

Optional (strong technical detail, short):
“We also **cache** period summaries so it stays fast, and we can refresh if new entries arrive.”

---

## 4) Why it meaningfully makes a hard day easier (20–30 seconds)

“The benefit is concrete:
- **Less effort**: talk instead of typing.
- **Less cognitive load**: summaries reduce rereading.
- **Less ‘lost context’**: retrieval is structured like memory actually works — big picture first, details when you need them.”
 
“And importantly: **it doesn’t try to coach you**. It doesn’t give advice or tell you how you feel — it just helps you **not lose your own thoughts**.”

---

## 5) Technical execution + Cursor leverage (30–45 seconds)

“We used Cursor to move faster *and* build more cleanly:
- A dockerized full stack (React/Vite + FastAPI + Mongo + STT service).
- A layered backend with **pluggable adapters** for transcription and AI analysis (so it works in stub mode, or with real providers).
- Clear **data contracts** and OpenAPI routes so the UI and API stayed consistent while iterating.”

If you want a single “proof” page for judges:
“You can verify the system health at `/api/health` and browse the API docs at `/api/docs`.”

---

## 6) Closing (10 seconds)

“That’s the project: **a voice journal that doesn’t disappear** — it turns messy, emotional, hard-day thoughts into an organized timeline you can actually return to.”

---

## Presenter checklist (don’t say out loud)

- You’re already logged in (or be ready to register quickly).
- Have at least 3 entries across 2 different days if possible (for calendar + trends).
- If you’re using real AI providers, make sure env vars are set; otherwise demo still works with stubs.

