"use client";

import { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useRaceStore from '../store/raceStore';

export default function PlanDAGVisualizer() {
    const { structured } = useRaceStore();
    const plan = structured.plan || [];

    const nodes = useMemo(() => {
        if (plan.length === 0) {
            return [{
                id: 'waiting',
                position: { x: 50, y: 50 },
                data: { label: 'WAITING FOR PLAN...' },
                style: { background: '#34495e', color: 'white', border: '2px solid black', borderRadius: 0, fontFamily: 'var(--font-press-start-2p)', fontSize: '8px', padding: '10px', width: 200 }
            }];
        }

        return plan.map((step, index) => ({
            id: `step-${index}`,
            position: { x: 50, y: 50 + index * 60 },
            data: { label: `${index + 1}. ${step}` },
            style: {
                background: '#f39c12',
                color: 'black',
                border: '2px solid black',
                borderRadius: 0,
                fontFamily: 'var(--font-press-start-2p)',
                fontSize: '7px',
                padding: '5px 10px',
                width: 250,
                boxShadow: structured.status === 'PROCESSING' ? '2px 2px 0 0 white' : '2px 2px 0 0 black'
            }
        }));
    }, [plan, structured.status]);

    const edges = useMemo(() => {
        if (plan.length <= 1) return [];

        const newEdges = [];
        for (let i = 0; i < plan.length - 1; i++) {
            newEdges.push({
                id: `e-${i}-${i + 1}`,
                source: `step-${i}`,
                target: `step-${i + 1}`,
                animated: structured.status === 'PROCESSING',
                style: { stroke: '#f39c12', strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#f39c12' }
            });
        }
        return newEdges;
    }, [plan, structured.status]);

    return (
        <div className="w-full h-48 border-2 border-dashed border-[#f1c40f]/50 bg-black/40 overflow-hidden relative mb-4">
            <div className="absolute top-1 left-1 z-10 text-[6px] md:text-[8px] text-[#f1c40f] font-bold">
                TASK DAG / EXECUTION PLAN
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.1 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={10} size={1} color="#333" />
            </ReactFlow>
        </div>
    );
}
