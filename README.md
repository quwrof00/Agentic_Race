# 🏁 Agentic Race

A real-time head-to-head battle arena for AI agents. You write a prompt, two agents race to answer it simultaneously, and a third AI judges who won.

Built for fun to visually compare a raw LLM call vs. a structured agentic pipeline — side by side, streaming live.

---

## What It Does

Two agents receive the same prompt at the same time and race to produce the best answer:

| Agent | Strategy |
|---|---|
| **Baseline** | Calls the LLM directly. No planning. No searching. Just speed. |
| **Structured** | Checks if web search is needed → builds a step-by-step plan → executes it → reflects on the output → refines or re-searches if needed. |

Once both agents finish, a **Judge Agent** evaluates both responses and scores them across three dimensions:

- **Accuracy** — Is the information factually correct?
- **Completeness** — Did it fully answer the prompt?
- **Helpfulness** — Is it actually useful?

All of this streams live to the UI via SSE (Server-Sent Events), so you watch both agents type their answers in real time.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js Frontend               │
│                                                  │
│  ┌──────────────┐          ┌──────────────────┐  │
│  │   Baseline   │          │   Structured     │  │
│  │   Panel      │          │   Panel          │  │
│  │              │          │  + DAG Visualizer│  │
│  └──────────────┘          └──────────────────┘  │
│              ↑ SSE stream                        │
└──────────────┼──────────────────────────────────┘
               │
┌──────────────┼──────────────────────────────────┐
│              │    FastAPI Backend                 │
│              │                                   │
│  ┌───────────┴──────────────────────────────┐    │
│  │         /race  (SSE endpoint)            │    │
│  │    asyncio.gather → runs both agents     │    │
│  │    simultaneously, pushes events to queue│    │
│  └──┬──────────────────────────────────┬───┘    │
│     │                                  │         │
│  ┌──▼──────────┐             ┌─────────▼──────┐  │
│  │  Baseline   │             │   Structured   │  │
│  │  Agent      │             │   Agent        │  │
│  │             │             │  (LangGraph)   │  │
│  │  Direct LLM │             │                │  │
│  │  call       │             │  check_search  │  │
│  └─────────────┘             │  → gen_plan    │  │
│                              │  → execute     │  │
│                              │  → reflect     │  │
│                              │  → refine/loop │  │
│                              └────────────────┘  │
│                                    ↓              │
│                          ┌─────────────────────┐  │
│                          │   Judge Agent       │  │
│                          │   scores both       │  │
│                          └─────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Structured Agent — LangGraph State Machine

The structured agent is a proper agentic loop built with LangGraph:

```
START
  └─→ check_search   (does this need web search? → Tavily if yes)
        └─→ generate_plan   (produce 3–5 step JSON plan)
              └─→ execute_plan   (stream answer token by token)
                    └─→ reflect   (is output good enough?)
                          ├─→ [satisfied] → END
                          ├─→ [needs refine] → refine_answer → reflect
                          └─→ [needs more search] → check_search → ...
```

---

## Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| **FastAPI** | API server + SSE streaming endpoint |
| **LangGraph** | State machine for the structured agent |
| **Groq** (`llama-3.1-8b-instant`) | LLM inference (fast + free tier) |
| **Tavily** | Web search for the structured agent |
| **asyncio** | Runs both agents in parallel |

### Frontend
| Tool | Purpose |
|---|---|
| **Next.js 16** | App framework |
| **React 19** | UI |
| **Zustand** | Global race state management |
| **React Flow (`@xyflow/react`)** | Live DAG visualizer for the structured agent's plan |
| **react-markdown** | Renders agent responses as markdown |
| **Tailwind CSS v4** | Styling |

---

## Project Structure

```
agentic-race/
├── backend/
│   ├── agents/
│   │   ├── baseline.py       # Direct LLM streaming agent
│   │   ├── structured.py     # LangGraph agentic pipeline
│   │   └── judge.py          # Scores both responses 0–100
│   ├── utils/
│   │   └── llm.py            # Shared async streaming wrapper (Groq via OpenAI SDK)
│   ├── config.py             # Model config (Groq, llama-3.1-8b-instant)
│   ├── main.py               # FastAPI app + /race SSE endpoint
│   ├── schemas.py
│   └── requirements.txt
│
└── agentic-race/             # Next.js frontend
    ├── app/
    │   ├── page.tsx          # Home / prompt entry page
    │   └── race/             # Live race page
    ├── components/
    │   └── PlanDAGVisualizer.tsx  # React Flow graph of the structured agent's plan
    └── store/
        └── raceStore.ts      # Zustand store — all race state lives here
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq](https://console.groq.com/) API key (free)
- A [Tavily](https://tavily.com/) API key (free tier available)

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/agentic-race.git
cd agentic-race
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd agentic-race
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to Use

1. **Enter a prompt** on the home page — or pick one from the mission presets.
2. Hit **START ►** — both agents initialize immediately.
3. Watch them race in real time on the race page:
   - The **Baseline panel** streams its answer directly.
   - The **Structured panel** shows its status logs, a live DAG of its execution plan, and its streaming answer.
4. Once both finish, the **Judge** scores them and reveals the winner with dimension breakdowns.

### Prompt Tips

> **Baseline-favored** — static knowledge questions (explain theory of relativity, summarize Romeo and Juliet, translation tasks). The structured agent's overhead doesn't pay off here.

> **Structured-favored** — anything requiring real-time or recent info (current Bitcoin price, latest Oscar winner, today's trending movies). The baseline will hallucinate; the structured agent will search.

---

## Notes

- The model is `llama-3.1-8b-instant` via Groq — deliberately fast and lightweight to keep the race interesting. Swap it in `config.py` if you want to test others.
- The structured agent caps reflection retries at 1 (`MAX_REFLECTION_RETRIES = 1`) to keep latency reasonable.
- Token counts shown in the UI are exact (pulled from the streaming usage metadata), not estimated.

---

## License

MIT
