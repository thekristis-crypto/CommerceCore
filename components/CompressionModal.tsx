import React from 'react';

interface CompressionModalProps {
    progress: number;
    onCancel: () => void;
}

const CompressionModal: React.FC<CompressionModalProps> = ({ progress, onCancel }) => {
    const percentage = Math.round(progress * 100);

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[100]"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 m-4 max-w-md w-full text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Compressing Video...</h2>
                <p className="text-slate-400 mb-6">
                    Your video is a bit large. We're optimizing it for analysis. Please wait a moment.
                </p>
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-linear" 
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-lg font-mono font-semibold text-indigo-300 mt-4">{percentage}%</p>
                <button 
                    onClick={onCancel}
                    className="mt-6 bg-slate-600/50 hover:bg-slate-600 text-slate-300 font-bold py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CompressionModal;