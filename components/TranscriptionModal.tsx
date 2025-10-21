import React, { useState, useEffect } from 'react';
import type { TranscriptionData } from '../types';

interface TranscriptionModalProps {
    transcriptionData: TranscriptionData;
    onClose: () => void;
    isOpen: boolean;
}

const getFlagEmoji = (locale: string | null): string => {
    if (!locale) return '🏳️';
    const code = locale.toUpperCase().split(/[-_]/)[0];
    const flags: { [key: string]: string } = {
        US: '🇺🇸', UK: '🇬🇧', GB: '🇬🇧', EN: '🇺🇸', ES: '🇪🇸', DE: '🇩🇪', FR: '🇫🇷', PT: '🇵🇹', IT: '🇮🇹', AU: '🇦🇺',
    };
    return flags[code] || '🏳️';
};

const getLanguageName = (locale: string | null): string => {
    if (!locale) return 'Original Language';
    try {
        const langCode = locale.split(/[-_]/)[0];
        const displayName = new Intl.DisplayNames(['en'], { type: 'language' });
        const name = displayName.of(langCode);
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Original Language';
    } catch (e) {
        console.error("Could not get language name for locale:", locale, e);
        return 'Original Language';
    }
};

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const TranscriptionBlock = ({ title, emoji, text, section, onCopy, copiedSection }: { title: string, emoji: string, text: string | null, section: 'original' | 'translation', onCopy: () => void, copiedSection: string | null }) => {
    if (!text) return null;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <span>{emoji}</span>
                    <span>{title}</span>
                </h3>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1 px-2 rounded-md transition-colors disabled:opacity-50"
                    disabled={copiedSection === section}
                >
                    {copiedSection === section ? <CheckIcon /> : <CopyIcon />}
                    {copiedSection === section ? 'Copied' : 'Copy'}
                </button>
            </div>
            <div className="bg-slate-900/70 p-4 rounded-md">
                <p className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{text}</p>
            </div>
        </div>
    );
};


const TranscriptionModal: React.FC<TranscriptionModalProps> = ({ transcriptionData, onClose, isOpen }) => {
    const [copiedSection, setCopiedSection] = useState<'original' | 'translation' | null>(null);

    useEffect(() => {
        if (!isOpen) setCopiedSection(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const { language, fullText, translation } = transcriptionData;

    const handleCopy = (text: string, section: 'original' | 'translation') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedSection(section);
            setTimeout(() => setCopiedSection(null), 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-800/80 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 p-6 m-4 max-w-2xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700/50">
                    <h2 className="text-2xl font-bold text-white">Video Transcription</h2>
                    <button 
                        onClick={onClose} 
                        className="text-slate-500 hover:text-white hover:bg-slate-700 rounded-full p-1 transition-colors"
                        aria-label="Close"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                    {fullText ? (
                        <TranscriptionBlock 
                            title={getLanguageName(language)}
                            emoji={getFlagEmoji(language)}
                            text={fullText}
                            section="original"
                            onCopy={() => handleCopy(fullText, 'original')}
                            copiedSection={copiedSection}
                        />
                    ) : (
                        <p className="text-slate-400 text-center py-8">No transcription available.</p>
                    )}

                    <TranscriptionBlock 
                        title="English"
                        emoji={getFlagEmoji('en-US')}
                        text={translation}
                        section="translation"
                        onCopy={() => handleCopy(translation || '', 'translation')}
                        copiedSection={copiedSection}
                    />
                </div>

                 <div className="mt-6 pt-4 border-t border-slate-700/50 text-right">
                    <button 
                        onClick={onClose} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
                .overflow-y-auto::-webkit-scrollbar { width: 8px; }
                .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
                .overflow-y-auto::-webkit-scrollbar-thumb { background-color: rgba(129, 140, 248, 0.4); border-radius: 20px; border: 3px solid transparent; }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover { background-color: rgba(129, 140, 248, 0.6); }
            `}</style>
        </div>
    );
};

export default TranscriptionModal;
