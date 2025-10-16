import React, { useState, useEffect, useRef } from 'react';
import type { GeneralKnowledgeFile } from '../types';
import Spinner from './Spinner';

/**
 * Transforms an incorrect Cloudinary "collection" URL (a link to an HTML preview page)
 * into a direct "resource" delivery URL that points to the raw file.
 * This is necessary to bypass browser security features (like X-Frame-Options)
 * that prevent embedding the management page in an iframe.
 * @param url The original URL from the database.
 * @param filename The name of the file, used to construct the public ID.
 * @returns A direct delivery URL (res.cloudinary.com) or the original URL if no transformation is needed.
 */
const transformCloudinaryUrl = (url: string, filename: string): string => {
    if (url.includes('collection.cloudinary.com')) {
        const match = url.match(/collection\.cloudinary\.com\/([^/]+)/);
        if (match && match[1]) {
            const cloudName = match[1];
            // Construct the standard direct delivery URL.
            // The 'image' asset type is often used for PDFs, and 'upload' is the standard delivery type.
            // encodeURIComponent handles spaces and special characters in the filename.
            return `https://res.cloudinary.com/${cloudName}/image/upload/${encodeURIComponent(filename)}`;
        }
    }
    // Return the original URL if it's not a collection URL or if the regex fails.
    return url; 
};


const FileViewerModal: React.FC<{ file: GeneralKnowledgeFile | null; onClose: () => void; }> = ({ file, onClose }) => {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (file && file.type === 'text/plain') {
            setIsLoading(true);
            setError(null);
            setTextContent(null);
            const fileUrl = file.path;
            fetch(fileUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to fetch text file. Status: ${res.status}. Please check the file URL.`);
                    return res.text();
                })
                .then(text => setTextContent(text))
                .catch(err => {
                    console.error("Text file fetch error:", err);
                    setError(err.message);
                })
                .finally(() => setIsLoading(false));
        } else {
            // Reset state for non-text files or when the file is cleared
            setTextContent(null);
            setError(null);
            setIsLoading(false);
        }
    }, [file]);

    if (!file) return null;
    
    // Always use the transformed URL for viewing and downloading.
    const fileUrl = transformCloudinaryUrl(file.path, file.name);

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900/90 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white truncate pr-4" title={file.name}>{file.name}</h2>
                    <div className="flex items-center gap-4">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-md transition-colors">
                            View Original
                        </a>
                         <a href={fileUrl} download={file.name} className="text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-md transition-colors">
                            Download
                        </a>
                        <button onClick={onClose} className="text-slate-500 hover:text-white hover:bg-slate-700 rounded-full p-1 transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex bg-slate-950/50 relative">
                    {file.type === 'application/pdf' ? (
                        <iframe src={fileUrl} title={file.name} className="w-full h-full border-0" />
                    ) : file.type === 'text/plain' ? (
                        <div className="w-full h-full overflow-auto p-4">
                            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80"><Spinner /></div>}
                            {error && <div className="m-auto text-center text-red-400 bg-red-900/50 p-4 rounded-md"><h3 className="font-bold">Error</h3><p>{error}</p></div>}
                            {textContent && <pre className="whitespace-pre-wrap text-sm text-slate-300">{textContent}</pre>}
                        </div>
                    ) : (
                         <div className="m-auto text-center text-slate-400 p-8">
                            <h3 className="font-bold text-lg">Unsupported File Type</h3>
                            <p className="text-sm mt-2">Preview is not available for this file type.</p>
                            <p className="text-sm mt-1">Please use the "View Original" or "Download" buttons to access the file.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FileViewerModal;