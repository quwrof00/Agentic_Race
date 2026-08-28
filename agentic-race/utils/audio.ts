let audioCtx: AudioContext | null = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// A quick helper to play simple synthetic sounds
const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    const ctx = initAudio();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const playStartSound = () => {
    // A rising arpeggio / "Power Up" sound
    const ctx = initAudio();
    if (!ctx) return;
    playTone(440, 'square', 0.1, 0.2);
    setTimeout(() => playTone(554, 'square', 0.1, 0.2), 100);
    setTimeout(() => playTone(659, 'square', 0.1, 0.2), 200);
    setTimeout(() => playTone(880, 'square', 0.3, 0.2), 300);
};

export const playTypingSound = () => {
    // Quick random blip for typing
    const freq = 400 + Math.random() * 400;
    playTone(freq, 'square', 0.05, 0.05);
};

export const playJudgeImpact = () => {
    // Deep heavy hit for judge verdict
    const ctx = initAudio();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1);
};
