# 🏁 Agentic Race

A real-time head-to-head battle arena for AI agents. You write a prompt, two agents race to answer it simultaneously, and a third AI judges who won.

Built to visually compare a raw LLM call vs. a structured agentic pipeline - side by side, streaming live. By measuring **Accuracy**, **Latency**, and **Token Cost**, this project answers the ultimate question: *When is a complex agent actually worth the overhead?*

---

## Execution & Architecture

Under the hood, Agentic Race is powered by a high-performance stack designed for concurrent execution and live streaming:

### Tech Stack
* **FastAPI**: Backend server running asynchronous event loops.
* **LangGraph**: State machine orchestrating the complex structured agent.
* **Groq (`mixtral-8x7b-32768`)**: Lightning-fast LLM inference.
* **Tavily**: Live web search integration.
* **Next.js 16 / React 19**: Responsive, fully dynamic frontend.
* **Zustand**: Global state management for live race metrics.

### How It Works
Two agents receive the same prompt simultaneously:

1. **The Baseline Agent**: Calls the LLM directly. No planning, no searching. Just pure inference speed.
2. **The Structured Agent**: Runs through a robust LangGraph pipeline:
   - **Plan**: Evaluates if web search is needed.
   - **Execute**: Streams a generated response.
   - **Reflect & Refine**: Self-evaluates its own response against the original prompt, utilizing **Temporal Awareness** to check current dates against retrieved facts (e.g., verifying if an event has already occurred). It will re-search and rewrite if necessary.
3. **The Judge AI**: Once both agents finish, a third independent AI evaluates them on **Accuracy**, **Completeness**, and **Helpfulness**, providing a full markdown-rendered reasoning report.

---

## Originality & Innovation

While many tools exist to test single prompts, Agentic Race provides a **live, split-screen battleground** for competing AI architectures. 

* **Live Streaming Token Metrics**: Unlike static dashboards, token counts and exact latency stopwatches update live via Server-Sent Events (SSE).
* **"Thinking" Transparency Modal**: Click the "VIEW THINKING" button on the Structured agent to pull up a full-screen breakdown of its exact internal monologue, search queries, and self-reflection loops.
* **Interactive Accuracy Sliders**: Users can manually override the Judge's accuracy score to dynamically re-calculate the Cost Efficiency rating.

---

## Practical Value & Impact

The project isn't just a race; it's an educational tool for prompt engineering and AI architecture optimization. It introduces the **Cost Efficiency Score**:

`Cost Efficiency = (Accuracy² / (Latency × log₁₀(Tokens))) / 10`

By dynamically calculating **Live USD Costs** based on token usage and comparing it to the stopwatch latency, developers can visualize the tradeoff between speed, cost, and accuracy:

* **When to use Baseline**: Creative writing, generic coding algorithms, simple translations. *Zero latency, fractions of a cent, utilizing vast pre-trained knowledge.*
* **When to use Structured**: Real-time stock prices, recent news events, complex logic puzzles. *Higher latency and cost, but guaranteed accuracy and fact-checking.*

---

## User Experience & UI

The UI is built with a sleek, responsive **Cyberpunk / Retro Arcade** aesthetic designed to make AI benchmarking fun and visceral.

* **Responsive Design**: Flawless edge-to-edge layouts on mobile devices, with dynamic layout shifting for the "FIGHT!" VS screens.
* **Micro-animations**: Pulsing status indicators, glowing neon borders, shaking impact animations, and custom pixel-art styling.
* **Markdown Support**: Agent outputs and the Judge's reasoning are fully rendered with `react-markdown` and `remark-gfm` for beautiful readability, tables, and lists.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq](https://console.groq.com/) API key (free)
- A [Tavily](https://tavily.com/) API key (free tier available)

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
cd ../agentic-race
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter a prompt to begin the race!

---

## License

MIT
