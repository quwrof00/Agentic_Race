import { create } from 'zustand';

interface AgentState {
    response: string;
    status: 'IDLE' | 'PROCESSING' | 'DONE' | 'ERROR';
    logs: string[];
    startTime: number | null;
    endTime: number | null;
    tokens: number;
    exactTokensUsed: boolean;
    accuracy: number;
    plan: string[];
    apiCalls: number;
}

interface RaceState {
    prompt: string;
    baseline: AgentState;
    structured: AgentState;
    judge: {
        status: 'IDLE' | 'PROCESSING' | 'DONE' | 'ERROR';
        reasoning: string;
        educational_breakdown?: string;
        dimensions?: {
            accuracy: { baseline: number; structured: number };
            completeness: { baseline: number; structured: number };
            helpfulness: { baseline: number; structured: number };
        };
    }

    setPrompt: (prompt: string) => void;
    updateAgent: (agent: 'baseline' | 'structured' | 'judge', type: string, data: any) => void;
    setAccuracy: (agent: 'baseline' | 'structured', value: number) => void;
    resetRace: () => void;
}

const initialAgentState: AgentState = {
    response: '',
    status: 'IDLE',
    logs: [],
    startTime: null,
    endTime: null,
    tokens: 0,
    exactTokensUsed: false,
    accuracy: 100,
    plan: [],
    apiCalls: 0,
};

const useRaceStore = create<RaceState>((set) => ({
    prompt: '',
    baseline: { ...initialAgentState },
    structured: { ...initialAgentState },
    judge: { status: 'IDLE', reasoning: '' },

    setPrompt: (prompt) => set({ prompt }),

    setAccuracy: (agentName, value) =>
        set((state) => ({
            [agentName]: {
                ...state[agentName],
                accuracy: value
            }
        })),

    updateAgent: (agentName, type, data) =>
        set((state) => {
            if (agentName === 'judge') {
                if (type === 'status') {
                    return { judge: { ...state.judge, status: 'PROCESSING' } };
                } else if (type === 'complete') {
                    return {
                        judge: { status: 'DONE', reasoning: data.reasoning, dimensions: data.dimensions, educational_breakdown: data.educational_breakdown },
                        baseline: { ...state.baseline, accuracy: data.baseline_score },
                        structured: { ...state.structured, accuracy: data.structured_score }
                    };
                } else if (type === 'error') {
                    return { judge: { ...state.judge, status: 'ERROR' } };
                }
                return state;
            }

            if (agentName !== 'baseline' && agentName !== 'structured') {
                console.warn(`Unknown agent ${agentName}: ${data}`);
                return state;
            }
            const currentAgent = state[agentName];
            const newAgentState = { ...currentAgent };

            if (!newAgentState.startTime && (type === 'token' || type === 'status')) {
                newAgentState.startTime = Date.now();
            }

            switch (type) {
                case 'token':
                    newAgentState.response += data;
                    newAgentState.status = 'PROCESSING';
                    // We keep the estimation for a live counter, but it will be overridden by the exact count
                    if (!newAgentState.exactTokensUsed) {
                        newAgentState.tokens = Math.ceil(newAgentState.response.length / 4);
                    }
                    break;
                case 'tokens':
                    // Exact count from the backend
                    newAgentState.tokens = parseInt(data, 10);
                    newAgentState.exactTokensUsed = true;
                    break;
                case 'api_calls':
                    newAgentState.apiCalls = parseInt(data, 10);
                    break;
                case 'clear':
                    newAgentState.response = '';
                    if (!newAgentState.exactTokensUsed) newAgentState.tokens = 0;
                    break;
                case 'status':
                    newAgentState.logs = [...newAgentState.logs, `[STATUS] ${data}`];
                    newAgentState.status = 'PROCESSING';
                    break;
                case 'complete':
                    newAgentState.status = 'DONE';
                    newAgentState.endTime = Date.now();
                    newAgentState.logs = [...newAgentState.logs, `[COMPLETE] Finished.`];
                    break;
                case 'error':
                    newAgentState.status = 'ERROR';
                    newAgentState.endTime = Date.now();
                    newAgentState.logs = [...newAgentState.logs, `[ERROR] ${data}`];
                    break;
                case 'plan':
                    newAgentState.plan = data;
                    break;
            }

            return { [agentName]: newAgentState };
        }),

    resetRace: () => set({
        baseline: { ...initialAgentState },
        structured: { ...initialAgentState },
        judge: { status: 'IDLE', reasoning: '' }
    }),
}));

export default useRaceStore;
