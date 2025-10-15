import React from 'react';
import type { AdType } from '../types';

interface AdSelectorProps {
    onSelect: (type: AdType) => void;
}

const AdSelector: React.FC<AdSelectorProps> = ({ onSelect }) => {

    const OptionCard: React.FC<{ type: AdType, title: string, description: string, icon: React.ReactElement }> = ({ type, title, description, icon }) => (
        <button
            onClick={() => onSelect(type)}
            className="group w-full text-left p-6 bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-indigo-500 hover:bg-slate-700/50 transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="flex items-center">
                <div className="p-3 bg-slate-700 group-hover:bg-indigo-600 rounded-md mr-4 transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{title}</span>
                         {type === 'static' && (
                            <span className="text-xs font-semibold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                                Beta
                            </span>
                        )}
                    </h3>
                    <p className="text-slate-400 mt-1">{description}</p>
                </div>
            </div>
        </button>
    );

    return (
        <div className="text-center">
            <h2 className="text-2xl font-semibold mb-6">What type of ad are you working on?</h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
                <OptionCard 
                    type="video"
                    title="Video Ad"
                    description="Iterate on hooks for video creatives."
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <OptionCard
                    type="static"
                    title="Static Ad"
                    description="Iterate on headlines, visuals, and CTAs."
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    }
                />
            </div>
        </div>
    );
};

export default AdSelector;