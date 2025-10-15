import React from 'react';
import type { IterationType } from '../types';

interface IterationTargetSelectorProps {
    onSelect: (type: IterationType) => void;
    videoUrl: string;
}

const OptionCard: React.FC<{ 
    onClick: () => void, 
    title: string, 
    description: string, 
    icon: React.ReactElement 
}> = ({ onClick, title, description, icon }) => (
    <button
        onClick={onClick}
        className="group w-full text-left p-4 bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-indigo-500 hover:bg-slate-700/50 transition-all duration-300"
    >
        <div className="flex items-center">
            <div className="p-2 bg-slate-700 group-hover:bg-indigo-600 rounded-md mr-3 transition-colors">
                {icon}
            </div>
            <div>
                <h3 className="text-md font-bold text-white">{title}</h3>
                <p className="text-slate-400 mt-1 text-sm">{description}</p>
            </div>
        </div>
    </button>
);

const IterationTargetSelector: React.FC<IterationTargetSelectorProps> = ({ onSelect, videoUrl }) => {
    return (
        <div className="space-y-4">
             <video key={videoUrl} src={videoUrl} controls className="w-full rounded-lg shadow-lg" playsInline />
            <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-md font-semibold text-center text-slate-300">What do you want to iterate on?</h3>
                <div className="flex flex-col gap-3">
                     <OptionCard 
                        onClick={() => onSelect('copy')}
                        title="Change the Script/Copy"
                        description="Select text from the transcription to rewrite."
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    />
                    <OptionCard 
                        onClick={() => onSelect('visual')}
                        title="Change the Visuals"
                        description="Select a time range to get new visual ideas."
                        icon={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default IterationTargetSelector;
