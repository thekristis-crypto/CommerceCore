import React, { useState } from 'react';
import type { GeneralKnowledgeFile } from '../types';
import Spinner from './Spinner';
import FileViewerModal from './FileViewerModal';

interface KnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    persistedFiles: GeneralKnowledgeFile[];
    isLoading: boolean;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose, persistedFiles, isLoading }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [viewingFile, setViewingFile] = useState<GeneralKnowledgeFile | null>(null);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'kristijonas') {
            setIsAuthenticated(true);
            setAuthError('');
            setPassword('');
        } else {
            setAuthError('Incorrect password. Please try again.');
        }
    };
    
    const handleClose = () => {
        setIsAuthenticated(false);
        setPassword('');
        setAuthError('');
        setViewingFile(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={handleClose}
                aria-modal="true"
                role="dialog"
            >
                <div 
                    className="bg-slate-800/80 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                    onClick={e => e.stopPropagation()}
                >
                    <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
                        <button 
                            onClick={handleClose} 
                            className="text-slate-500 hover:text-white hover:bg-slate-700 rounded-full p-1 transition-colors"
                            aria-label="Close"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>
                    
                    {!isAuthenticated ? (
                        <div className="p-8 text-center">
                            <h3 className="text-lg font-semibold mb-4">Access Restricted</h3>
                            <p className="text-slate-400 mb-6">Please enter the password to manage the knowledge base.</p>
                            <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                                <input 
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Password"
                                    autoFocus
                                />
                                {authError && <p className="text-sm text-red-400">{authError}</p>}
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                    Unlock
                                </button>
                            </form>
                        </div>
                    ) : (
                         <main className="flex-grow p-6 overflow-y-auto space-y-6">
                            <section className="space-y-3">
                                <h3 className="font-semibold text-slate-300">Available Documents</h3>
                                 <p className="text-xs text-slate-400">New documents must be uploaded directly to the cloud provider (e.g., Cloudinary) and added to the backend `db.json` file.</p>
                                {isLoading && persistedFiles.length === 0 ? (
                                    <div className="flex items-center justify-center text-slate-400 p-4 bg-slate-900/50 rounded-md">
                                        <Spinner /> <span className="ml-2">Loading Knowledge...</span>
                                    </div>
                                ) : persistedFiles.length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border border-slate-700/50 rounded-md p-2">
                                        {persistedFiles.map(file => (
                                            <div key={file.name} className="flex items-center p-2 rounded-md w-full bg-slate-700/50">
                                                <FileIcon />
                                                <span className="text-sm font-medium text-slate-300 truncate flex-grow" title={file.name}>{file.name}</span>
                                                <button onClick={() => setViewingFile(file)} className="text-xs ml-4 bg-indigo-600/50 hover:bg-indigo-600 text-white py-1 px-3 rounded-md transition">View</button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4 bg-slate-900/50 rounded-md">No knowledge files found.</p>
                                )}
                            </section>
                         </main>
                    )}
                </div>
            </div>
             <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
             <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </>
    );
};

export default KnowledgeBaseModal;
