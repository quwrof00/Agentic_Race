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
    <div className="min-h-screen flex flex-col items-center p-4 relative font-[family-name:var(--font-press-start-2p)] overflow-hidden gap-4">

      {/* Title */}
      <div className="w-full flex justify-center items-center pt-4 pb-2 z-10">
        <h1
          className="text-3xl sm:text-4xl md:text-6xl font-bold text-yellow-400 tracking-tighter drop-shadow-[4px_4px_0_rgba(0,0,0,1)] text-center"
          style={{ textShadow: "4px 4px 0 #c0392b, -2px -2px 0 #f1c40f" }}
        >
          A<span className="text-white text-xl sm:text-2xl md:text-4xl align-middle mx-1">GENTIC</span>{" "}
          R<span className="text-white text-xl sm:text-2xl md:text-4xl align-middle mx-1">ACE</span>
        </h1>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center z-10">

        {/* Mission Input Panel */}
        <div className="pixel-panel w-full bg-[#bdc3c7] p-1 shadow-[8px_8px_0_0_rgba(0,0,0,0.5)]">
          <div className="pixel-panel-header flex justify-between items-center mb-1">
            <span>NEW MISSION OBJECTIVE</span>
            <span className="text-red-400 animate-pulse">● REC</span>
          </div>

          <div className="bg-[#ecf0f1] p-4 sm:p-6 border-4 border-[#7f8c8d] flex flex-col relative">

            {/* Dialogue Box Style Input */}
            <div className="bg-[#2c3e50]/10 p-3 sm:p-4 border-2 border-dashed border-[#7f8c8d] mb-4 relative group hover:bg-[#2c3e50]/20 transition-colors z-10">
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
                className="w-full min-h-[120px] sm:min-h-[150px] bg-transparent resize-none outline-none text-[#2c3e50] font-bold text-base sm:text-lg md:text-xl placeholder:text-[#7f8c8d]/60 leading-relaxed"
                style={{ fontFamily: "inherit" }}
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 border border-[#7f8c8d]">
                {input.length} / MAX
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 z-10">
              <div className="text-[#e74c3c] text-[9px] sm:text-[10px] md:text-xs animate-pulse hidden sm:block shrink-0">
                WARNING: LIVE AGENTS INITIALIZE ON START.
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  className="pixel-btn bg-gray-500 text-[10px] sm:text-xs py-3 px-4 shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.2)] hover:bg-gray-400"
                  onClick={() => setInput("")}
                >
                  CLEAR
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="pixel-btn bg-[#2ecc71] text-sm sm:text-base font-bold py-3 px-5 sm:px-8 border-b-4 border-r-4 border-[#27ae60] hover:brightness-110 shadow-[4px_4px_0_0_black] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                >
                  {loading ? "UPLINK..." : "START \u25ba"}
                </button>
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div className="mt-4 pt-4 border-t-2 border-dashed border-[#7f8c8d]">
              <div className="text-[10px] text-[#7f8c8d] mb-2 font-bold">MISSION PRESETS (CLICK TO LOAD)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-[8px] text-[#3498db] font-bold mb-1">BASELINE FAVORED PROMPTS:</div>
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
                  <div className="text-[8px] text-[#f1c40f] font-bold mb-1">STRUCTURED FAVORED PROMPTS:</div>
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

      {/* Background vignette */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

    </div>
  );
}
