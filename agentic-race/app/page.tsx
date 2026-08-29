"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = `/race?prompt=${encodeURIComponent(input)}`;
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-0 sm:p-4 relative font-[family-name:var(--font-press-start-2p)] overflow-hidden gap-4">

      {/* Title */}
      <div className="w-full flex flex-col justify-center items-center pt-8 sm:pt-4 pb-2 z-10 px-4 sm:px-0">
        <h1
          className="text-3xl sm:text-4xl md:text-6xl font-bold text-yellow-400 tracking-tighter drop-shadow-[4px_4px_0_rgba(0,0,0,1)] text-center mb-6"
          style={{ textShadow: "4px 4px 0 #c0392b, -2px -2px 0 #f1c40f" }}
        >
          A<span className="text-white text-xl sm:text-2xl md:text-4xl align-middle mx-1">GENTIC</span>{" "}
          R<span className="text-white text-xl sm:text-2xl md:text-4xl align-middle mx-1">ACE</span>
        </h1>
        <a href="#about" className="pixel-btn bg-black text-blue-400 text-[10px] sm:text-xs py-2 px-6 border-2 border-blue-500 shadow-[4px_4px_0_0_rgba(59,130,246,0.5)] hover:bg-blue-900 active:translate-y-px active:shadow-none transition-all tracking-widest">
          WHAT IS THIS?
        </a>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center z-10 mt-4">

        {/* Mission Input Panel */}
        <div className="pixel-panel w-full bg-[#bdc3c7] p-1 shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] border-y-4 sm:border-4 border-[#7f8c8d]">
          <div className="pixel-panel-header flex justify-between items-center mb-1 text-black">
            <span className="tracking-widest text-[8px] sm:text-xs font-bold">NEW MISSION OBJECTIVE</span>
            <span className="text-red-500 animate-pulse text-[8px] sm:text-[10px] tracking-widest font-bold">AWAITING INPUT_</span>
          </div>

          <div className="bg-[#ecf0f1] p-3 sm:p-6 border-y-4 sm:border-4 border-[#7f8c8d] flex flex-col relative">

            {/* Dialogue Box Style Input */}
            <div className="bg-[#2c3e50]/10 p-2 sm:p-4 border-2 border-dashed border-[#7f8c8d] mb-4 relative group hover:bg-[#2c3e50]/20 transition-colors z-10">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading && input.trim()) handleSubmit();
                  }
                }}
                placeholder="ENTER PROMPT TO COMMENCE RACE..."
                className="w-full min-h-[120px] sm:min-h-[150px] bg-transparent resize-none outline-none text-[#2c3e50] font-bold text-sm sm:text-lg md:text-xl placeholder:text-[#7f8c8d]/60 leading-relaxed custom-scrollbar"
                style={{ fontFamily: "inherit" }}
              />
              <div className="absolute bottom-2 right-2 text-[8px] sm:text-[10px] text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 border border-[#7f8c8d]">
                {input.length} / 500
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 z-10">
              <div className="text-[#e74c3c] text-[9px] sm:text-[10px] md:text-xs hidden sm:block shrink-0 tracking-widest font-bold">
                WARNING: LIVE AGENTS INITIALIZE ON START.
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  className="pixel-btn bg-gray-500 text-white text-[10px] sm:text-xs py-3 px-4 shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.2)] hover:bg-gray-400"
                  onClick={() => setInput("")}
                >
                  CLEAR
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="pixel-btn bg-[#2ecc71] text-white text-xs sm:text-base font-bold py-3 px-4 sm:px-8 border-b-4 border-r-4 border-[#27ae60] hover:brightness-110 shadow-[4px_4px_0_0_black] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 tracking-widest"
                >
                  {loading ? "LOADING..." : "START RACE"}
                </button>
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-[#7f8c8d]">
              <div className="text-[10px] text-[#7f8c8d] mb-3 font-bold tracking-widest">MISSION PRESETS (CLICK TO LOAD)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[8px] text-[#3498db] font-bold mb-2 tracking-widest">BASELINE FAVORED:</div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setInput(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full bg-white/50 text-[10px] p-2 border border-[#bdc3c7] hover:border-[#3498db] transition-all text-black outline-none cursor-pointer truncate"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a Mission --</option>
                    <option value="Explain the theory of relativity in simple terms.">Explain the theory of relativity in simple terms.</option>
                    <option value="Translate 'Hello, how are you?' to Spanish.">Translate &apos;Hello, how are you?&apos; to Spanish.</option>
                    <option value="Summarize the plot of Romeo and Juliet.">Summarize the plot of Romeo and Juliet.</option>
                    <option value="What are the core differences between mitosis and meiosis?">Differences between mitosis and meiosis.</option>
                    <option value="Give me a step-by-step recipe for authentic Hyderabadi Chicken Biryani.">Recipe for Hyderabadi Chicken Biryani.</option>
                  </select>
                </div>
                <div>
                  <div className="text-[8px] text-[#f1c40f] font-bold mb-2 tracking-widest">STRUCTURED FAVORED:</div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setInput(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full bg-white/50 text-[10px] p-2 border border-[#bdc3c7] hover:border-[#f1c40f] transition-all text-black outline-none cursor-pointer truncate"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a Mission --</option>
                    <option value="What's the weather like in New York today, and what should I wear?">Weather in New York today</option>
                    <option value="Who won the Best Picture award at the Oscars this year?">This year&apos;s Oscar Best Picture winner</option>
                    <option value="What are the top 3 trending movies on Netflix right now?">Trending movies on Netflix</option>
                    <option value="What is the current exact price of Bitcoin?">Current price of Bitcoin</option>
                    <option value="What were the main product announcements from the most recent Apple Keynote event?">Recent Apple Keynote announcements</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* About Section */}
      <section id="about" className="w-full max-w-4xl mt-16 mb-20 z-10 px-0 sm:px-4">
        <div className="bg-[#2c3e50]/90 border-y-4 sm:border-4 border-yellow-400 p-6 sm:p-8 shadow-none sm:shadow-[12px_12px_0_0_rgba(0,0,0,0.8)]">
            <h2 className="text-2xl md:text-3xl text-yellow-400 mb-6 border-b-4 border-yellow-400/50 pb-2 flex items-center gap-4">
              <span className="text-white">?</span> WHAT IS AGENTIC RACE?
            </h2>
            
            <div className="space-y-6 text-white/90 text-sm md:text-base font-sans leading-relaxed">
              <p>
                <strong className="text-yellow-300 block mb-1">THE OBJECTIVE</strong>
                Agentic Race is a visual battleground comparing two types of Artificial Intelligence architectures: a <strong>Baseline LLM</strong> vs a <strong>Structured Agent</strong>. It demonstrates the trade-offs between raw speed and structured thinking.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-black/40 p-4 border-l-4 border-blue-500">
                  <h3 className="text-blue-400 font-bold mb-2">🟦 THE BASELINE</h3>
                  <p className="text-xs">A standard AI model (like ChatGPT) that streams a response immediately. It&apos;s incredibly fast and cheap, but it cannot browse the web, verify facts, or think step-by-step.</p>
                </div>
                
                <div className="bg-black/40 p-4 border-l-4 border-yellow-500">
                  <h3 className="text-yellow-400 font-bold mb-2">🟨 THE STRUCTURED AGENT</h3>
                  <p className="text-xs">An agentic system that thinks before it speaks. It creates a plan, searches the live web for context, and can reflect on its own answers to correct mistakes. It&apos;s slower and uses more tokens, but is vastly more accurate for complex or real-time tasks.</p>
                </div>
              </div>
              
              <p className="mt-6 pt-6 border-t border-white/20">
                <strong className="text-yellow-300 block mb-1">THE VALUE</strong>
                By racing them side-by-side and using a third AI &quot;Judge&quot; to score their accuracy, you can visualize the <strong>Cost Efficiency</strong> of complex agent architectures. Sometimes, a simple prompt doesn&apos;t need an agent. Other times, an agent is the only way to get the right answer.
              </p>

              <div className="mt-8 bg-black/60 p-5 md:p-6 border-2 border-dashed border-[#7f8c8d]">
                <strong className="text-green-400 block mb-4 text-base md:text-lg">✅ FINAL OBSERVATIONS: WHEN TO USE WHICH</strong>
                
                <div className="space-y-4">
                  <div>
                    <strong className="text-blue-400">🟦 USE THE BASELINE FOR:</strong>
                    <ul className="list-disc list-inside text-xs md:text-sm text-gray-300 mt-2 space-y-1 ml-2">
                      <li>Creative writing, brainstorming, and generic text generation.</li>
                      <li>Simple translations or summarizing well-known, historical concepts.</li>
                      <li>Standard coding algorithms that haven't changed in years.</li>
                      <li><span className="italic text-gray-400">Why?</span> It provides instant speed and zero latency at a fraction of the cost, utilizing its vast pre-trained knowledge base.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <strong className="text-yellow-400">🟨 USE THE STRUCTURED AGENT FOR:</strong>
                    <ul className="list-disc list-inside text-xs md:text-sm text-gray-300 mt-2 space-y-1 ml-2">
                      <li>Real-time data retrieval (e.g., current stock prices, live weather, news).</li>
                      <li>Fact-checking recent events that occurred after the model's training cutoff.</li>
                      <li>Complex, multi-step problems requiring planning and self-correction.</li>
                      <li><span className="italic text-gray-400">Why?</span> The cost of higher latency and token usage is vastly outweighed by the need for guaranteed accuracy and up-to-date facts.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Background vignette */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

      </div>
    );
  }
