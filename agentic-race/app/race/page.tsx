"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import useRaceStore from "../../store/raceStore";
import { useRaceStream } from "../../hooks/useRaceStream";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Suspense, useState, useEffect, useRef } from "react";
import LivePreviewRenderer from "../../components/LivePreviewRenderer";
import SystemArchitectureVisualizer from "../../components/SystemArchitectureVisualizer";
import PlanDAGVisualizer from "../../components/PlanDAGVisualizer";
import { playStartSound, playTypingSound, playJudgeImpact } from "../../utils/audio";

function LiveStopwatch({ agentState }: { agentState: any }) {
    const [elapsed, setElapsed] = useState("0.00");

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (agentState.status === 'PROCESSING' && agentState.startTime) {
            interval = setInterval(() => {
                setElapsed(((Date.now() - agentState.startTime) / 1000).toFixed(2));
            }, 50);
        } else if (agentState.status === 'DONE' && agentState.startTime && agentState.endTime) {
            setElapsed(((agentState.endTime - agentState.startTime) / 1000).toFixed(2));
        } else if (agentState.status === 'IDLE') {
            setElapsed("0.00");
        }
        return () => clearInterval(interval);
    }, [agentState.status, agentState.startTime, agentState.endTime]);

    return <span className="text-cyan-300 font-mono ml-2">⏱ {elapsed}s</span>;
}

function MetricsPanel({ agentName, agentState, setAccuracy, isWinner, judgeStatus }: { agentName: 'baseline' | 'structured', agentState: any, setAccuracy: any, isWinner?: boolean, judgeStatus?: string }) {
    if (agentState.status !== 'DONE' || !agentState.startTime || !agentState.endTime) return null;

    const latency = Math.max(((agentState.endTime - agentState.startTime) / 1000), 0.01).toFixed(2);
    const tokens = agentState.tokens || 1;

    // Cost Calculation ($0.20 per 1M tokens)
    const COST_PER_TOKEN = 0.0000002;
    const usdCost = (tokens * COST_PER_TOKEN).toFixed(6);

    // Score = Accuracy² / (Latency * log10(Tokens))
    // We emphasize accuracy (Accuracy²) and logarithmically scale tokens 
    // to prevent baseline agents from winning just by returning 1 token at 1% accuracy.
    const tokenPenalty = Math.max(Math.log10(tokens), 1);
    const rawScore = Math.pow(agentState.accuracy, 2) / (Number(latency) * tokenPenalty);
    const costEfficiencyScore = (rawScore / 10).toFixed(2); // scaled for readability

    return (
        <div className="mt-6 border-2 border-white/20 p-4 bg-white/5 rounded">
            <h3 className="text-white text-xs mb-4">■ COST EFFICIENCY ANALYSIS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] mb-4 font-sans">
                <div>
                    <span className="text-gray-400 block mb-1">LATENCY:</span>
                    <span className="text-cyan-300 text-sm">{latency}s</span>
                </div>
                <div>
                    <span className="text-gray-400 block mb-1">TOKENS:</span>
                    <span className="text-purple-300 text-sm">{tokens}</span>
                </div>
                <div>
                    <span className="text-gray-400 block mb-1">API CALLS:</span>
                    <span className="text-orange-300 text-sm">{agentState.apiCalls || 1}</span>
                </div>
                <div>
                    <span className="text-gray-400 block mb-1">USD COST:</span>
                    <span className="text-green-400 text-sm">${usdCost}</span>
                </div>
            </div>

            <div className="mb-4 font-sans relative">
                {judgeStatus === 'PROCESSING' && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 border border-purple-500/50">
                        <span className="text-purple-400 text-[10px] animate-pulse font-bold">JUDGE CALIBRATING...</span>
                    </div>
                )}
                <div className="flex justify-between text-[10px] mb-2">
                    <span className="text-gray-400">ACCURACY RATING:</span>
                    <span className="text-green-300 font-bold">{agentState.accuracy}%</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={agentState.accuracy}
                    onChange={(e) => setAccuracy(agentName, Number(e.target.value))}
                    className="w-full accent-green-500"
                />
            </div>

            <div className={`pt-4 border-t border-white/20 relative ${isWinner ? 'bg-gradient-to-t from-yellow-900/40 p-2 to-transparent outline outline-4 outline-yellow-500/50 mt-2' : ''}`}>
                <div className="text-[10px] text-gray-400 mb-1 flex justify-between items-center">
                    <span>COST EFF_ SCORE:</span>
                    {isWinner && <span className="text-yellow-400 font-bold">👑 BEST EFFICIENCY</span>}
                </div>
                <div className={`text-xl md:text-2xl filter transition-all ${isWinner ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] font-bold lg:text-3xl scale-110 origin-left' : 'text-gray-400'}`}>
                    {costEfficiencyScore}
                </div>
                <div className="text-[8px] text-gray-500 mt-2">Score = (Accuracy² / (Latency × log₁₀(Tokens))) / 10</div>
            </div>
        </div>
    );
}

function RaceContent() {
    const endRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const prompt = searchParams.get("prompt") || "";

    const [isLivePreview, setIsLivePreview] = useState(true);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [copiedBaseline, setCopiedBaseline] = useState(false);
    const [copiedStructured, setCopiedStructured] = useState(false);
    const [showVsScreen, setShowVsScreen] = useState(true);
    const [judgeFlashed, setJudgeFlashed] = useState(false);
    const [flashActive, setFlashActive] = useState(false);
    const [showThinkingModal, setShowThinkingModal] = useState(false);

    const handleCopy = (text: string, agent: 'baseline' | 'structured') => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text);
        if (agent === 'baseline') {
            setCopiedBaseline(true);
            setTimeout(() => setCopiedBaseline(false), 2000);
        } else {
            setCopiedStructured(true);
            setTimeout(() => setCopiedStructured(false), 2000);
        }
    };

    // Connect to the stream
    useRaceStream(prompt);

    // Get live state from the store
    const { baseline, structured, judge, setAccuracy } = useRaceStore();

    const [isWakingUp, setIsWakingUp] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (baseline.status === 'IDLE' && structured.status === 'IDLE') {
            timeout = setTimeout(() => {
                setIsWakingUp(true);
            }, 3000);
        } else {
            setIsWakingUp(false);
        }
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [baseline.status, structured.status]);

    // Throttle typing sounds
    const lastTypeSound = useRef(0);
    useEffect(() => {
        const now = Date.now();
        if (now - lastTypeSound.current > 50) {
            if (baseline.status === 'PROCESSING' || structured.status === 'PROCESSING') {
                playTypingSound();
                lastTypeSound.current = now;
            }
        }
    }, [baseline.response, structured.response]);

    useEffect(() => {
        playStartSound();
        const t = setTimeout(() => setShowVsScreen(false), 2000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (judge.status === 'DONE' && endRef.current && !judgeFlashed) {
            playJudgeImpact();
            setJudgeFlashed(true);
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 800);
            setTimeout(() => {
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, [judge.status]);

    const calculateEfficiency = (agentState: any) => {
        if (!agentState.startTime || !agentState.endTime) return 0;
        const latency = Math.max(((agentState.endTime - agentState.startTime) / 1000), 0.01);
        const tokens = agentState.tokens || 1;
        const tokenPenalty = Math.max(Math.log10(tokens), 1);
        const rawScore = Math.pow(agentState.accuracy, 2) / (latency * tokenPenalty);
        return rawScore / 10;
    };

    const baselineCE = calculateEfficiency(baseline);
    const structuredCE = calculateEfficiency(structured);
    const bothDone = baseline.status === 'DONE' && structured.status === 'DONE';

    const isBaselineWinner = bothDone && baselineCE > structuredCE;
    const isStructuredWinner = bothDone && structuredCE > baselineCE;

    return (
        <>
            {isPromptExpanded && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#2c3e50] border-4 border-yellow-400 p-6 max-w-2xl w-full pixel-panel shadow-[0_0_30px_rgba(241,196,15,0.4)]">
                        <div className="flex justify-between items-center border-b-4 border-black/50 pb-2 mb-4">
                            <h2 className="text-yellow-600 border-2 border-black p-2 text-sm md:text-lg">FULL MISSION PROMPT</h2>
                            <button onClick={() => setIsPromptExpanded(false)} className="text-white bg-red-500 border-2 border-black px-2 hover:bg-red-400 transition-colors shadow-[2px_2px_0_0_black] active:translate-y-px active:shadow-none text-xl">X</button>
                        </div>
                        <div className="text-black font-sans text-sm md:text-base max-h-[60vh] overflow-y-auto custom-scrollbar leading-relaxed">
                            {prompt}
                        </div>
                    </div>
                </div>
            )}

            {showThinkingModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 font-sans">
                    <div className="bg-[#1a1a2e] border-4 border-purple-500 p-6 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                        <div className="flex justify-between items-center border-b border-purple-500/50 pb-4 mb-4 shrink-0">
                            <h2 className="text-purple-400 font-bold text-xl flex items-center gap-2 font-[family-name:var(--font-press-start-2p)]">
                                AGENT THOUGHT PROCESS
                            </h2>
                            <button onClick={() => setShowThinkingModal(false)} className="text-white bg-red-500 border-2 border-black px-3 py-1 hover:bg-red-400 transition-colors shadow-[2px_2px_0_0_black] active:translate-y-px active:shadow-none text-lg font-bold">X</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {(!structured.thoughts || structured.thoughts.length === 0) ? (
                                <div className="text-gray-400 text-center py-8 italic">No thoughts recorded yet...</div>
                            ) : (
                                structured.thoughts.map((thought: any, index: number) => (
                                    <div key={index} className="bg-black/50 border border-purple-900/50 p-4 rounded text-sm">
                                        <h3 className="text-purple-300 font-bold mb-2 uppercase tracking-wider">{thought.title}</h3>
                                        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    a: ({ node, ...props }) => (
                                                        <a {...props} className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer" />
                                                    )
                                                }}
                                            >
                                                {thought.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={`min-h-screen flex flex-col p-4 relative font-[family-name:var(--font-press-start-2p)] overflow-hidden ${judgeFlashed ? 'animate-shake' : ''}`}>
                {showVsScreen && (
                    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 flex flex-col md:flex-row">
                            <div className="h-1/2 md:h-full w-full md:w-1/2 bg-blue-900 animate-vs-left border-b-8 md:border-b-0 md:border-r-8 border-black flex items-center justify-center">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl text-blue-300 drop-shadow-[0_0_15px_rgba(0,0,0,1)] text-center">BASELINE</h1>
                            </div>
                            <div className="h-1/2 md:h-full w-full md:w-1/2 bg-yellow-600 animate-vs-right border-t-8 md:border-t-0 md:border-l-8 border-black flex items-center justify-center">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl text-yellow-300 drop-shadow-[0_0_15px_rgba(0,0,0,1)] text-center">STRUCTURED</h1>
                            </div>
                        </div>
                        <div className="absolute top-1/2 md:top-20 -translate-y-1/2 md:translate-y-0 text-5xl sm:text-6xl md:text-7xl text-red-500 font-bold animate-vs-fight filter drop-shadow-[0_5px_0_rgba(255,255,255,1)] tracking-widest z-10 text-center w-full">
                            FIGHT!
                        </div>
                    </div>
                )}
                {flashActive && <div className="fixed inset-0 bg-white z-[90] pointer-events-none animate-flash"></div>}

                {/* Header */}
                <header className="w-full flex justify-between items-center mb-6 z-10 gap-2">
                    <div className="bg-black/50 p-2 flex-1 border-2 border-white/30 rounded flex items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center gap-2 flex-1 overflow-hidden pointer-events-auto">
                            <span className="text-yellow-400 text-xs md:text-sm whitespace-nowrap">MISSION:</span>
                            <span className="text-white text-[10px] md:text-xs truncate max-w-[140px] sm:max-w-[200px] md:max-w-md">{prompt || "Establishing Link..."}</span>
                            <button onClick={() => setIsPromptExpanded(true)} className="ml-2 text-[8px] md:text-[10px] bg-[#34495e] border border-white text-white px-2 py-1 shadow-[2px_2px_0_0_black] active:translate-y-px active:translate-x-px whitespace-nowrap">
                                VIEW FULL
                            </button>
                        </div>
                    </div>
                    <div className="pixel-btn bg-red-500 text-white text-[10px] md:text-xs border-4 border-black animate-pulse whitespace-nowrap shrink-0">
                        LIVE
                    </div>
                </header>

                <SystemArchitectureVisualizer />

                {isWakingUp && (
                    <div className="bg-[#2c3e50] border-4 border-[#e74c3c] p-4 text-center mt-4 mb-4 pixel-panel animate-pulse shadow-[0_0_20px_rgba(231,76,60,0.4)] relative mx-auto w-full max-w-2xl z-20">
                        <h2 className="text-[#e74c3c] text-sm md:text-lg mb-2">RENDER SERVER WAKING UP...</h2>
                        <p className="text-white text-[10px] md:text-xs leading-relaxed font-sans">
                            The backend API is on a free tier and spinning up from sleep. This usually takes about 50 seconds. Please hold.
                        </p>
                        <div className="flex justify-center items-center gap-2 mt-4">
                            <div className="w-2 h-2 bg-[#e74c3c] animate-ping rounded-full" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-[#e74c3c] animate-ping rounded-full" style={{ animationDelay: '200ms' }}></div>
                            <div className="w-2 h-2 bg-[#e74c3c] animate-ping rounded-full" style={{ animationDelay: '400ms' }}></div>
                        </div>
                    </div>
                )}

                {/* Main Race Venue */}
                <main className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 z-10 mb-20">

                    {/* Left: Baseline Agent */}
                    <div className="flex flex-col h-full relative group pb-4">
                        {/* Character Avatar/Label */}
                        <div className="z-20 flex items-end gap-2 relative pl-4 mb-2">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 border-4 border-black shadow-[4px_4px_0_0_black]">
                                {/* Placeholder Avatar */}
                                <div className="w-full h-full bg-blue-400 animate-pulse"></div>
                            </div>
                            <div className="bg-black text-white px-3 py-1 border-2 border-white/50 text-[10px] md:text-xs mb-1 md:mb-2">
                                BASELINE AGENT
                            </div>
                        </div>

                        {/* Screen Container */}
                        <div className={`flex-1 pixel-panel bg-[#34495e] p-1 flex flex-col overflow-hidden transition-all duration-1000 ${isBaselineWinner ? 'border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : ''}`}>
                            <div className="pixel-panel-header bg-[#2c3e50] border-b-4 border-black/50 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span>STATUS: {baseline.status} <LiveStopwatch agentState={baseline} /></span>
                                    {baseline.status === 'DONE' && (
                                        <button onClick={() => handleCopy(baseline.response, 'baseline')} className="text-[8px] bg-black text-white px-2 py-1 shadow-[2px_2px_0_0_rgba(255,255,255,0.3)] hover:text-green-400 active:translate-y-px active:shadow-none transition-all">
                                            {copiedBaseline ? 'COPIED!' : 'COPY'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <div className={`w-3 h-3 rounded-full border border-black ${baseline.status === 'ERROR' ? 'bg-red-500' : 'bg-red-900'}`}></div>
                                    <div className={`w-3 h-3 rounded-full border border-black ${baseline.status === 'PROCESSING' ? 'bg-yellow-500 animate-bounce' : 'bg-yellow-900'}`}></div>
                                    <div className={`w-3 h-3 rounded-full border border-black ${baseline.status === 'DONE' ? 'bg-green-500' : 'bg-green-900'}`}></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-black p-4 font-mono text-green-400 text-xs md:text-sm overflow-y-auto font-[family-name:var(--font-press-start-2p)] leading-loose shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] custom-scrollbar">
                                {/* Logs for status updates */}
                                {baseline.logs.length > 0 && (
                                    <div className="mb-4 text-green-700 border-b border-green-900 pb-2 text-[10px]">
                                        {baseline.logs.map((log, i) => (
                                            <div key={i}>{log}</div>
                                        ))}
                                    </div>
                                )}

                                <div className="markdown-terminal">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                    >
                                        {baseline.response}
                                    </ReactMarkdown>
                                    {baseline.status === 'PROCESSING' && (
                                        <div className="flex items-center gap-2 mt-4 p-3 bg-blue-900/20 border-l-4 border-blue-500 rounded font-sans">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: '200ms' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: '400ms' }}></div>
                                            </div>
                                            <span className="text-[10px] md:text-xs text-blue-300 animate-pulse font-bold tracking-wider">GENERATING OUTPUT...</span>
                                        </div>
                                    )}
                                </div>

                                {baseline.status === 'DONE' && (
                                    <MetricsPanel agentName="baseline" agentState={baseline} setAccuracy={setAccuracy} isWinner={isBaselineWinner} judgeStatus={judge.status} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Structured Agent */}
                    <div className="flex flex-col h-full relative group pb-4">
                        {/* Character Avatar/Label */}
                        <div className="z-20 flex items-end gap-2 relative flex-row-reverse mb-2 pr-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-400 border-4 border-black shadow-[-4px_4px_0_0_black]">
                                {/* Placeholder Avatar */}
                                <div className="w-full h-full bg-yellow-200 animate-pulse"></div>
                            </div>
                            <div className="bg-black text-white px-3 py-1 border-2 border-white/50 text-[10px] md:text-xs mb-1 md:mb-2">
                                STRUCTURED AGENT
                            </div>
                        </div>

                        {/* Screen Container */}
                        <div className={`flex-1 pixel-panel bg-[#34495e] p-1 flex flex-col overflow-hidden transition-all duration-1000 ${isStructuredWinner ? 'border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : ''}`}>
                            <div className="pixel-panel-header bg-[#2c3e50] border-b-4 border-black/50 flex justify-between flex-row-reverse items-center">
                                <div className="flex items-center gap-2">
                                    <span>STATUS: {structured.status} <LiveStopwatch agentState={structured} /></span>
                                    {structured.status === 'DONE' && (
                                        <button onClick={() => handleCopy(structured.response, 'structured')} className="ml-2 text-[8px] bg-black text-white px-2 py-1 shadow-[2px_2px_0_0_rgba(255,255,255,0.3)] hover:text-green-400 active:translate-y-px active:shadow-none transition-all">
                                            {copiedStructured ? 'COPIED!' : 'COPY'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowThinkingModal(true)}
                                        className="ml-2 text-[8px] md:text-[10px] px-2 py-1 bg-purple-600 text-white border-2 border-white shadow-[2px_2px_0_0_white] hover:bg-purple-500 active:translate-y-px active:shadow-none transition-all"
                                    >
                                        VIEW THINKING
                                    </button>
                                    <button
                                        onClick={() => setIsLivePreview(!isLivePreview)}
                                        className={`ml-2 text-[8px] md:text-[10px] px-2 py-1 border-2 ${isLivePreview ? 'bg-yellow-400 text-black border-white shadow-[2px_2px_0_0_white]' : 'bg-black text-yellow-400 border-yellow-400 shadow-[2px_2px_0_0_yellow]'} active:translate-y-px active:shadow-none transition-all`}
                                    >
                                        {isLivePreview ? 'LIVE UI: ON' : 'LIVE UI: OFF'}
                                    </button>
                                </div>
                                <div className="flex gap-1">
                                    <div className={`w-3 h-3 rounded-full border border-black ${structured.status === 'ERROR' ? 'bg-red-500' : 'bg-red-900'}`}></div>
                                    <div className={`w-3 h-3 rounded-full border border-black ${structured.status === 'PROCESSING' ? 'bg-yellow-500 animate-bounce' : 'bg-yellow-900'}`}></div>
                                    <div className={`w-3 h-3 rounded-full border border-black ${structured.status === 'DONE' ? 'bg-green-500' : 'bg-green-900'}`}></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-black p-4 font-mono text-yellow-400 text-xs md:text-sm overflow-y-auto font-[family-name:var(--font-press-start-2p)] leading-loose shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] custom-scrollbar">
                                <PlanDAGVisualizer />
                                {/* Logs for status updates */}
                                {structured.logs.length > 0 && (
                                    <div className="mb-4 text-yellow-700 border-b border-yellow-900 pb-2 text-[10px]">
                                        {structured.logs.map((log, i) => (
                                            <div key={i}>{log}</div>
                                        ))}
                                    </div>
                                )}

                                <div className="markdown-terminal">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                        components={{
                                            code({ node, inline, className, children, ...props }: any) {
                                                const match = /language-(\w+)/.exec(className || '');
                                                const isLiveOptions = ['tsx', 'jsx', 'javascript', 'typescript', 'react', 'js', 'ts'];
                                                if (!inline && match && isLiveOptions.includes(match[1]) && isLivePreview) {
                                                    // ReactMarkdown sometimes passes an array of nodes instead of a string.
                                                    // We MUST extract the pure string content out of it, otherwise we get [object Object]
                                                    const extractText = (node: any): string => {
                                                        if (typeof node === 'string') return node;
                                                        if (Array.isArray(node)) return node.map(extractText).join('');
                                                        if (node && node.props && node.props.children) return extractText(node.props.children);
                                                        return '';
                                                    };
                                                    const codeString = extractText(children).replace(/\n$/, '');
                                                    return (
                                                        <div className="my-6">
                                                            <LivePreviewRenderer code={codeString} />
                                                            <details className="mt-2 text-[10px] opacity-70 cursor-pointer text-yellow-500 bg-yellow-900/30 p-2 rounded">
                                                                <summary className="font-bold">VIEW AGENT RAW CODE SOURCE</summary>
                                                                <pre className={`${className} mt-2 overflow-x-auto`} {...props}>
                                                                    <code>{children}</code>
                                                                </pre>
                                                            </details>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {structured.response}
                                    </ReactMarkdown>
                                    {structured.status === 'PROCESSING' && (
                                        <div className="flex flex-row-reverse items-center justify-end md:justify-start md:flex-row gap-2 mt-4 p-3 bg-yellow-900/20 md:border-l-4 md:border-r-0 border-r-4 border-yellow-500 rounded font-sans w-full">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" style={{ animationDelay: '400ms' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" style={{ animationDelay: '200ms' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></div>
                                            </div>
                                            <span className="text-[10px] md:text-xs text-yellow-300 animate-pulse font-bold tracking-wider">GENERATING OUTPUT...</span>
                                        </div>
                                    )}
                                </div>

                                {structured.status === 'DONE' && (
                                    <MetricsPanel agentName="structured" agentState={structured} setAccuracy={setAccuracy} isWinner={isStructuredWinner} judgeStatus={judge.status} />
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Banner when both are done */}
                    <div className="col-span-1 md:col-span-2">
                        {baseline.status === 'DONE' && structured.status === 'DONE' && (
                            <div className="bg-[#2c3e50] border-4 border-[#f1c40f] p-4 text-center mt-4 pixel-panel animate-pulse shadow-[0_0_20px_rgba(241,196,15,0.4)] relative group transition-all">
                                <h2 className="text-yellow-400 text-sm md:text-lg mb-2">RACE COMPLETE - ANALYSIS READY</h2>
                                <p className="text-white text-[10px] md:text-xs">
                                    Adjust the accuracy scores above to find the true Cost Efficiency Score. Is the smarter agent worth the cost?
                                </p>
                            </div>
                        )}

                        {judge.status === 'PROCESSING' && (
                            <div className="bg-[#2c3e50] border-4 border-[#9b59b6] p-6 text-center mt-8 pixel-panel animate-pulse shadow-[0_0_20px_rgba(155,89,182,0.5)] relative">
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-[#9b59b6] border-2 border-black text-white text-xs shadow-[4px_4px_0_0_black] flex items-center gap-2 whitespace-nowrap">
                                    ⚖️ JUDGE AI
                                </div>
                                <h2 className="text-purple-300 text-sm md:text-lg mt-2">EVALUATING RESPONSES...</h2>
                                <p className="text-white/50 text-[10px] mt-2 font-sans md:text-xs">Analyzing accuracy, completeness, and helpfulness.</p>
                            </div>
                        )}

                        {judge.status === 'DONE' && (
                            <div className="bg-gradient-to-r from-[#2c3e50] via-[#8e44ad]/40 to-[#2c3e50] border-4 border-[#9b59b6] p-6 mt-8 pixel-panel relative shadow-[0_0_30px_rgba(155,89,182,0.5)] transition-all">
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-[#9b59b6] border-2 border-white text-white text-xs md:text-sm shadow-[4px_4px_0_0_black] flex items-center gap-2 whitespace-nowrap">
                                    JUDGE AI VERDICT
                                </div>

                                <div className="mt-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex-1 w-full bg-black/60 border-2 border-[#3498db] p-4 text-center relative shadow-[inset_0_0_15px_rgba(52,152,219,0.3)] flex flex-col justify-center items-center">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3498db] text-white text-[8px] px-2 py-0.5 border border-black font-bold shadow-[2px_2px_0_0_black]">BASELINE</div>
                                        <div className="text-4xl md:text-5xl text-white font-bold mt-2 filter drop-shadow-[0_2px_2px_rgba(52,152,219,0.8)]">
                                            {baseline.accuracy}<span className="text-lg md:text-xl text-[#3498db] inline-block ml-1">%</span>
                                        </div>
                                    </div>

                                    <div className="text-xl md:text-2xl text-[#9b59b6] font-bold shrink-0 opacity-70 my-2 md:my-0">VS</div>

                                    <div className="flex-1 w-full bg-black/60 border-2 border-[#f1c40f] p-4 text-center relative shadow-[inset_0_0_15px_rgba(241,196,15,0.3)] flex flex-col justify-center items-center">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#f1c40f] text-black text-[8px] px-2 py-0.5 border border-black font-bold shadow-[2px_2px_0_0_black]">STRUCTURED</div>
                                        <div className="text-4xl md:text-5xl text-white font-bold mt-2 filter drop-shadow-[0_2px_2px_rgba(241,196,15,0.8)]">
                                            {structured.accuracy}<span className="text-lg md:text-xl text-[#f1c40f] inline-block ml-1">%</span>
                                        </div>
                                    </div>
                                </div>

                                {judge.dimensions && (
                                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-[10px] md:text-xs">
                                        <div className="bg-black/60 border border-[#9b59b6]/50 p-3 relative shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-black px-2 text-[#9b59b6] border border-[#9b59b6]/50 whitespace-nowrap">ACCURACY</div>
                                            <div className="flex justify-between items-center mt-2 px-2">
                                                <span className="text-[#3498db] font-bold text-lg">{judge.dimensions.accuracy.baseline}</span>
                                                <span className="text-white/30 text-[8px]">VS</span>
                                                <span className="text-[#f1c40f] font-bold text-lg">{judge.dimensions.accuracy.structured}</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/60 border border-[#9b59b6]/50 p-3 relative shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-black px-2 text-[#9b59b6] border border-[#9b59b6]/50 whitespace-nowrap">COMPLETENESS</div>
                                            <div className="flex justify-between items-center mt-2 px-2">
                                                <span className="text-[#3498db] font-bold text-lg">{judge.dimensions.completeness.baseline}</span>
                                                <span className="text-white/30 text-[8px]">VS</span>
                                                <span className="text-[#f1c40f] font-bold text-lg">{judge.dimensions.completeness.structured}</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/60 border border-[#9b59b6]/50 p-3 relative shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-black px-2 text-[#9b59b6] border border-[#9b59b6]/50 whitespace-nowrap">HELPFULNESS</div>
                                            <div className="flex justify-between items-center mt-2 px-2">
                                                <span className="text-[#3498db] font-bold text-lg">{judge.dimensions.helpfulness.baseline}</span>
                                                <span className="text-white/30 text-[8px]">VS</span>
                                                <span className="text-[#f1c40f] font-bold text-lg">{judge.dimensions.helpfulness.structured}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 md:p-6 bg-black border-2 border-[#9b59b6] relative shadow-[0_0_15px_rgba(155,89,182,0.3)] mb-6 rounded-sm mt-4">
                                    <span className="absolute -top-3 left-4 bg-[#9b59b6] px-3 py-0.5 text-white text-[10px] md:text-xs border border-white font-bold tracking-widest">REASONING</span>
                                    <div className="text-gray-200 text-xs md:text-base leading-relaxed font-sans relative z-10 whitespace-pre-wrap">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            strong: ({node, ...props}) => <strong className="text-purple-300 font-bold" {...props} />,
                                            a: ({node, ...props}) => <a className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                        }}>
                                            {judge.reasoning || ""}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {judge.educational_breakdown && (
                                    <div className="p-4 md:p-6 bg-[#0a192f] border-2 border-blue-500 relative shadow-[0_0_15px_rgba(59,130,246,0.3)] rounded-sm">
                                        <span className="absolute -top-3 left-4 bg-blue-600 px-3 py-0.5 text-white text-[10px] md:text-xs border border-white flex items-center gap-2 font-bold tracking-widest">
                                            <span className="animate-pulse">💡</span> EDUCATIONAL BREAKDOWN
                                        </span>
                                        <div className="text-blue-100 text-xs md:text-base leading-relaxed font-sans relative z-10 whitespace-pre-wrap">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                strong: ({node, ...props}) => <strong className="text-blue-300 font-bold" {...props} />,
                                                a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                            }}>
                                                {judge.educational_breakdown}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 flex items-center justify-center gap-2 text-[8px] md:text-[10px] text-purple-300 bg-black/30 py-2 border border-purple-900/50">
                                    <span className="animate-pulse text-purple-400">●</span>
                                    <span>ACCURACY SCORES HAVE BEEN AUTO-CALIBRATED BY THE JUDGE</span>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                </main >

                {/* Footer Navigation */}
                < footer className="fixed bottom-0 left-0 w-full p-4 flex justify-center z-30 bg-gradient-to-t from-black/80 to-transparent" >
                    <Link href="/">
                        <button className="pixel-btn bg-orange-500 text-white border-b-4 border-r-4 border-orange-700 shadow-[4px_4px_0_0_black] flex items-center gap-2 hover:brightness-110 transition-all">
                            <span className="text-xl">↺</span> TRY NEW PROMPT
                        </button>
                    </Link>
                </footer >

                {/* Background vignette */}
                < div className="fixed inset-0 pointer-events-none bg-[radial-gradient(transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" >
                </div >

            </div >
        </>
    );
}

export default function RacePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white font-[family-name:var(--font-press-start-2p)]">Establishing Link...</div>}>
            <RaceContent />
        </Suspense>
    );
}
