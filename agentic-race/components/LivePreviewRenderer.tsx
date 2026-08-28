"use client";

import React from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";

export default function LivePreviewRenderer({ code }: { code: string }) {
    // Provide common UI libraries so the agent's code can use them!
    const scope = {
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        useRef: React.useRef,
        useCallback: React.useCallback,
        useMemo: React.useMemo
    };

    // react-live can't handle default exports or raw imports well. Let's strip them
    const sanitizeCode = (rawCode: string) => {
        let cleaned = rawCode
            // Remove multi-line and single-line imports with 'from'
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
            // Remove side-effect imports like import './styles.css'
            .replace(/import\s+['"][^'"]+['"];?/g, '')
            // Remove export default function
            .replace(/export\s+default\s+function/g, 'function')
            // Remove export const
            .replace(/export\s+const/g, 'const')
            // Remove export default [Name];
            .replace(/export\s+default\s+[A-Za-z0-9_]+;?/g, '')
            .trim();

        // react-live requires the code to either be a single expression, OR for you to call `render()`.
        // If it's pure inline JSX or a single function, throwing a render() wrapper handles multi-line blocks cleanly.
        if (!cleaned.includes("render(")) {
            // Find the primary Component Name
            const funcMatch = cleaned.match(/function\s+([A-Z][A-Za-z0-9_]+)/);
            const arrowMatch = cleaned.match(/const\s+([A-Z][A-Za-z0-9_]+)\s*=\s*(?:[A-Za-z0-9_]+|\([^)]*\))\s*=>/);

            let rootComponent = null;
            if (funcMatch) rootComponent = funcMatch[1];
            else if (arrowMatch) rootComponent = arrowMatch[1];

            if (rootComponent) {
                cleaned += `\nrender(<${rootComponent} />);`;
            }
        }

        console.log("=== RAW CODE ===", "\n" + rawCode);
        console.log("=== CLEANED CODE ===", "\n" + cleaned);

        return cleaned;
    };

    const cleanCode = sanitizeCode(code);

    // We only use noInline if the agent provided an explicit render() call OR if we forced a render() call.
    const hasRender = cleanCode.includes('render(');

    return (
        <div className="mt-4 border-2 border-yellow-400 bg-white text-black p-4 rounded min-h-[200px] overflow-auto shadow-[0_0_15px_rgba(250,204,21,0.5)] font-sans relative">
            <div className="absolute top-0 right-0 bg-yellow-400 text-black px-2 py-1 text-[8px] md:text-[10px] font-bold z-10 font-[family-name:var(--font-press-start-2p)]">
                LIVE PREVIEW
            </div>
            <LiveProvider code={cleanCode} scope={scope} enableTypeScript={true} noInline={hasRender}>
                <div className="pt-4">
                    <LivePreview />
                </div>
                <div className="text-red-500 text-xs font-mono mt-2 p-2 bg-red-100 rounded break-words max-w-full">
                    <LiveError />
                </div>
            </LiveProvider>
        </div>
    );
}
