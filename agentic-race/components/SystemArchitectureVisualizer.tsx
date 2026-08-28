"use client";

import { useMemo } from 'react';
import {
    ReactFlow,
    Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useRaceStore from '../store/raceStore';

export default function SystemArchitectureVisualizer() {
    const { baseline, structured, judge } = useRaceStore();

    const nodes = useMemo(() => [
        {
            id: '1',
            position: { x: 0, y: 100 },
            data: { label: 'MISSION PROMPT' },
            style: { background: '#2c3e50', color: 'white', border: '2px solid white', borderRadius: 0, fontFamily: 'var(--font-press-start-2p)', fontSize: '8px', padding: '10px' }
        },
        {
            id: '2',
            position: { x: 200, y: 20 },
            data: { label: 'BASELINE AGENT' },
            style: {
                background: baseline.status === 'PROCESSING' || baseline.status === 'DONE' ? '#2980b9' : '#34495e',
                color: 'white',
                border: baseline.status === 'PROCESSING' ? '2px solid #3498db' : '2px solid black',
                borderRadius: 0,
                fontFamily: 'var(--font-press-start-2p)',
                fontSize: '8px',
                padding: '10px',
                boxShadow: baseline.status === 'PROCESSING' ? '0 0 10px #3498db' : 'none'
            }
        },
        {
            id: '3',
            position: { x: 200, y: 180 },
            data: { label: 'STRUCTURED AGENT' },
            style: {
                background: structured.status === 'PROCESSING' || structured.status === 'DONE' ? '#f39c12' : '#34495e',
                color: 'black',
                border: structured.status === 'PROCESSING' ? '2px solid #f1c40f' : '2px solid black',
                borderRadius: 0,
                fontFamily: 'var(--font-press-start-2p)',
                fontSize: '8px',
                padding: '10px',
                boxShadow: structured.status === 'PROCESSING' ? '0 0 10px #f1c40f' : 'none'
            }
        },
        {
            id: '4',
            position: { x: 400, y: 100 },
            data: { label: 'JUDGE AI' },
            style: {
                background: judge.status === 'PROCESSING' || judge.status === 'DONE' ? '#8e44ad' : '#34495e',
                color: 'white',
                border: judge.status === 'PROCESSING' ? '2px solid #9b59b6' : '2px solid black',
                borderRadius: 0,
                fontFamily: 'var(--font-press-start-2p)',
                fontSize: '8px',
                padding: '10px',
                boxShadow: judge.status === 'PROCESSING' ? '0 0 10px #9b59b6' : 'none'
            }
        },
    ], [baseline.status, structured.status, judge.status]);

    const edges = useMemo(() => [
        {
            id: 'e1-2',
            source: '1',
            target: '2',
            animated: baseline.status === 'PROCESSING',
            style: { stroke: baseline.status === 'PROCESSING' || baseline.status === 'DONE' ? '#3498db' : 'white', strokeWidth: 2 }
        },
        {
            id: 'e1-3',
            source: '1',
            target: '3',
            animated: structured.status === 'PROCESSING',
            style: { stroke: structured.status === 'PROCESSING' || structured.status === 'DONE' ? '#f1c40f' : 'white', strokeWidth: 2 }
        },
        {
            id: 'e2-4',
            source: '2',
            target: '4',
            animated: judge.status === 'PROCESSING' || (baseline.status === 'DONE' && judge.status !== 'DONE'),
            style: { stroke: judge.status === 'PROCESSING' || judge.status === 'DONE' ? '#9b59b6' : (baseline.status === 'DONE' ? '#3498db' : 'white'), strokeWidth: 2 }
        },
        {
            id: 'e3-4',
            source: '3',
            target: '4',
            animated: judge.status === 'PROCESSING' || (structured.status === 'DONE' && judge.status !== 'DONE'),
            style: { stroke: judge.status === 'PROCESSING' || judge.status === 'DONE' ? '#9b59b6' : (structured.status === 'DONE' ? '#f1c40f' : 'white'), strokeWidth: 2 }
        },
    ], [baseline.status, structured.status, judge.status]);

    return (
        <div className="w-full h-48 border-4 border-[#7f8c8d] bg-black/50 overflow-hidden relative mb-4 shadow-[4px_4px_0_0_black]">
            <div className="absolute top-2 left-2 z-10 text-[8px] md:text-[10px] text-[#2c3e50] font-bold bg-[#bdc3c7] px-2 py-1 shadow-[2px_2px_0_0_black]">
                SYSTEM ARCHITECTURE
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={16} size={2} color="#444" />
            </ReactFlow>
        </div>
    );
}
