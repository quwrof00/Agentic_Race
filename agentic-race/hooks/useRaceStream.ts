import { useEffect, useRef } from 'react';
import useRaceStore from '../store/raceStore';

export function useRaceStream(prompt: string) {
    const { setPrompt, updateAgent, resetRace } = useRaceStore();

    const bufferRef = useRef({
        baseline: '',
        structured: ''
    });

    useEffect(() => {
        if (!prompt) return;

        // Reset store before starting
        resetRace();
        setPrompt(prompt);
        // Reset local buffer
        bufferRef.current = { baseline: '', structured: '' };

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(
            `${apiUrl}/race?prompt=${encodeURIComponent(prompt)}`
        );

        // Throttle state updates to prevent browser crashing
        const intervalId = setInterval(() => {
            if (bufferRef.current.baseline) {
                updateAgent('baseline', 'token', bufferRef.current.baseline);
                bufferRef.current.baseline = '';
            }
            if (bufferRef.current.structured) {
                updateAgent('structured', 'token', bufferRef.current.structured);
                bufferRef.current.structured = '';
            }
        }, 80); // Flush max ~12 times per second

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.agent === 'system' && payload.type === 'finish') {
                    eventSource.close();
                    return;
                }

                if (payload.agent) {
                    if (payload.type === 'token' && (payload.agent === 'baseline' || payload.agent === 'structured')) {
                        // Buffer tokens locally
                        bufferRef.current[payload.agent as 'baseline' | 'structured'] += payload.data;
                    } else {
                        // For non-token events, flush current buffer of that agent then apply event
                        if (payload.agent === 'baseline' || payload.agent === 'structured') {
                            const agentName = payload.agent as 'baseline' | 'structured';
                            if (payload.type === 'clear') {
                                bufferRef.current[agentName] = '';
                            } else if (bufferRef.current[agentName]) {
                                updateAgent(agentName, 'token', bufferRef.current[agentName]);
                                bufferRef.current[agentName] = '';
                            }
                        }
                        updateAgent(payload.agent as 'baseline' | 'structured', payload.type, payload.data);
                    }
                }
            } catch (error) {
                console.error('Failed to parse SSE:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
        };

        return () => {
            clearInterval(intervalId);
            eventSource.close();
        };
    }, [prompt, setPrompt, updateAgent, resetRace]);
}
