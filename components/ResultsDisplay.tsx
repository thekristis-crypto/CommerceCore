// FIX: Import 'useRef' and 'useLayoutEffect' to resolve 'Cannot find name' errors.
import React, { useRef, useLayoutEffect } from 'react';
import type { ChatMessage, AppStatus, ImageIteration, AdType } from '../types';
import Spinner from './Spinner';

interface ResultsDisplayProps {
    chatHistory: ChatMessage[];
    status: AppStatus;
    adType: AdType | null;
    selectedIteration: ImageIteration | null;
    onSelectIteration: (iteration: ImageIteration) => void;
}

const AiAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 border-2 border-slate-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </div>
);

const ThinkingIndicator = () => (
    <div className="flex justify-start items-start gap-3">
        <AiAvatar />
        <div className="bg-slate-800/80 p-4 rounded-lg shadow-md flex items-center space-x-2">
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
    </div>
);

const markdownToHtml = (text: string): string => {
    const lines = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").split('\n');
    let html = '';
    let listLevel = 0;

    const processInlineFormatting = (line: string) => {
        return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            while (listLevel > 0) {
                html += '</ul>';
                listLevel--;
            }
            continue;
        }

        if (trimmedLine.startsWith('### ')) {
             while (listLevel > 0) { html += '</ul>'; listLevel--; }
             html += `<h3 class="text-indigo-400 font-bold mt-4 mb-2 text-lg">${processInlineFormatting(trimmedLine.substring(4))}</h3>`;
             continue;
        }
        if (trimmedLine.startsWith('## ')) {
             while (listLevel > 0) { html += '</ul>'; listLevel--; }
             html += `<h2 class="text-indigo-300 font-bold mt-5 mb-3 text-xl">${processInlineFormatting(trimmedLine.substring(3))}</h2>`;
             continue;
        }

        if (trimmedLine === '---') {
            while (listLevel > 0) { html += '</ul>'; listLevel--; }
            html += '<hr class="my-4 border-slate-600">';
            continue;
        }
        
        const listMatch = line.match(/^(\s*)\* (.*)/);
        if (listMatch) {
            const indent = listMatch[1].length;
            const content = listMatch[2];
            const newLevel = Math.floor(indent / 2) + 1;

            while (newLevel < listLevel) {
                html += '</ul>';
                listLevel--;
            }
            while (newLevel > listLevel) {
                html += '<ul class="space-y-1 list-disc list-inside pl-4">';
                listLevel++;
            }

            html += `<li>${processInlineFormatting(content)}</li>`;
            continue;
        }
        
        while (listLevel > 0) {
            html += '</ul>';
            listLevel--;
        }
        html += `<p class="my-2">${processInlineFormatting(trimmedLine)}</p>`;
    }

    while (listLevel > 0) {
        html += '</ul>';
        listLevel--;
    }

    return html;
};

const ImageIterationResults: React.FC<{ 
    iterations: ImageIteration[]; 
    selectedIteration: ImageIteration | null;
    onSelectIteration: (iteration: ImageIteration) => void;
}> = ({ iterations, selectedIteration, onSelectIteration }) => (
    <div className="flex justify-start items-start gap-3">
        <AiAvatar />
        <div className="bg-slate-800/80 p-4 rounded-lg w-full max-w-3xl shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {iterations.map((iteration) => {
                    const isSelected = selectedIteration?.id === iteration.id;
                    const iterationIndex = Number(iteration.id.split('-')[1] ?? 0);
                    return (
                        <div key={iteration.id} className={`bg-slate-900/60 rounded-lg p-2 space-y-2 border-2 transition-all ${isSelected ? 'border-indigo-500 shadow-lg' : 'border-transparent'}`}>
                             {iteration.status === 'loading' && (
                                 <div className="aspect-square w-full bg-slate-800 rounded-md flex items-center justify-center animate-pulse">
                                     <Spinner />
                                 </div>
                             )}
                              {iteration.status === 'failed' && (
                                 <div className="aspect-square w-full bg-red-900/30 text-red-400 rounded-md flex flex-col items-center justify-center p-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    <p className="text-xs">Generation failed. Please try a different prompt.</p>
                                 </div>
                             )}
                             {iteration.status === 'done' && iteration.imageDataUrl && (
                                <>
                                    <img src={iteration.imageDataUrl} alt={`Iteration ${iterationIndex + 1}`} className="rounded-md w-full" />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onSelectIteration(iteration)}
                                            disabled={isSelected}
                                            className="w-full text-center text-xs font-semibold py-2 px-3 rounded-md bg-indigo-600/50 hover:bg-indigo-600/80 transition-colors disabled:bg-indigo-600 disabled:cursor-not-allowed"
                                        >
                                            {isSelected ? 'Selected' : `Select Iteration ${iterationIndex + 1}`}
                                        </button>
                                        <a 
                                            href={iteration.imageDataUrl} 
                                            download={`iteration-${iterationIndex + 1}.png`} 
                                            className="flex-shrink-0 block text-center text-xs font-semibold p-2 rounded-md bg-slate-600/50 hover:bg-slate-600/80 transition-colors"
                                            title="Download Iteration"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    </div>
                                </>
                             )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ chatHistory, status, adType, selectedIteration, onSelectIteration }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the bottom (which is visually the top in a reversed layout)
    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    return (
        <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto flex flex-col-reverse gap-6">
            {(status === 'generating' || status === 'chatting') && chatHistory[chatHistory.length - 1]?.type === 'user' && (
                <ThinkingIndicator />
            )}
            {[...chatHistory].reverse().map((message, index) => (
                <div key={index}>
                    {message.type === 'user' && (
                        <div className="flex justify-end">
                            <div className="bg-indigo-600/80 p-3 rounded-lg max-w-lg shadow-md">
                                <p className="text-sm text-indigo-50">{message.content}</p>
                            </div>
                        </div>
                    )}
                    {message.type === 'assistant' && (
                        <>
                           {typeof message.content === 'string' ? (
                                 <div className="flex justify-start items-start gap-3">
                                    <AiAvatar />
                                    <div className="bg-slate-800/80 p-4 rounded-lg w-full max-w-3xl shadow-md text-slate-300 leading-relaxed">
                                        <div
                                            className="prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
                                        />
                                    </div>
                                </div>
                           ) : (
                               <ImageIterationResults iterations={message.content} selectedIteration={selectedIteration} onSelectIteration={onSelectIteration} />
                           )}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ResultsDisplay;