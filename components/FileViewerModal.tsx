import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { GeneralKnowledgeFile } from '../types';
import Spinner from './Spinner';

// pdf.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^5.4.149/build/pdf.worker.mjs`;

interface FileViewerModalProps {
    file: GeneralKnowledgeFile | null;
    onClose: () => void;
}

const CORS_PROXY_URL = 'https://corsproxy.io/?';

// SVG Icons for UI clarity
const Icon: React.FC<{ path: string; className?: string }> = ({ path, className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d={path} clipRule="evenodd" /></svg>;

const HeaderButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }> = ({ onClick, title, children, disabled }) => (
    <button onClick={onClick} title={title} disabled={disabled} className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {children}
    </button>
);

const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
    const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [isRendering, setIsRendering] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const thumbnailContainerRef = useRef<HTMLDivElement>(null);

    const renderPage = useCallback(async (pageNum: number, pdf: pdfjs.PDFDocumentProxy, canvas: HTMLCanvasElement, renderZoom: number) => {
        setIsRendering(true);
        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: renderZoom });
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
        } catch (e) {
            console.error(`Failed to render page ${pageNum}`, e);
        } finally {
            setIsRendering(false);
        }
    }, []);
    
     useEffect(() => {
        if (status === 'success' && pdfDoc && canvasRef.current) {
            renderPage(currentPage, pdfDoc, canvasRef.current, zoom);
        }
    }, [pdfDoc, currentPage, zoom, status, renderPage]);

    useEffect(() => {
        const activeThumbnail = thumbnailContainerRef.current?.children[currentPage - 1];
        activeThumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [currentPage]);

    useEffect(() => {
        if (!file || file.type !== 'application/pdf') {
             if (file) setStatus('error');
             return;
        }
        const loadPdf = async () => {
            setStatus('loading');
            setPdfDoc(null);
            setThumbnails([]);
            try {
                const proxiedUrl = `${CORS_PROXY_URL}${encodeURIComponent(file.path)}`;
                const pdf = await pdfjs.getDocument(proxiedUrl).promise;
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
                setZoom(1);
                setStatus('success');
                
                const thumbPromises = Array.from({ length: pdf.numPages }, (_, i) => 
                    pdf.getPage(i + 1).then(page => {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d')!;
                        const viewport = page.getViewport({ scale: 0.2 });
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        return page.render({ canvasContext: context, viewport }).promise.then(() => canvas.toDataURL());
                    })
                );
                setThumbnails(await Promise.all(thumbPromises));
            } catch (error) {
                console.error('Failed to load PDF:', error);
                setStatus('error');
            }
        };
        loadPdf();
    }, [file]);

    const handleDownload = async () => {
        if (!file) return;
        try {
            const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(file.path)}`);
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(file.path, '_blank');
        }
    };

    const changePage = (offset: number) => setCurrentPage(prev => Math.max(1, Math.min(prev + offset, totalPages)));
    const adjustZoom = (amount: number) => setZoom(prev => Math.max(0.25, Math.min(prev + amount, 4)));
    const fitToPage = useCallback(() => {
        if (!viewerRef.current || !pdfDoc || !canvasRef.current?.parentElement) return;
        pdfDoc.getPage(currentPage).then(page => {
            const parent = canvasRef.current!.parentElement!;
            const scale = (parent.clientHeight / page.getViewport({ scale: 1 }).height) * 0.95;
            setZoom(scale);
        });
    }, [pdfDoc, currentPage]);
    const fitToWidth = useCallback(() => {
        if (!viewerRef.current || !pdfDoc || !canvasRef.current?.parentElement) return;
        pdfDoc.getPage(currentPage).then(page => {
             const parent = canvasRef.current!.parentElement!;
            const scale = (parent.clientWidth / page.getViewport({ scale: 1 }).width) * 0.95;
            setZoom(scale);
        });
    }, [pdfDoc, currentPage]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (!pdfDoc) return;
            if (e.key === 'ArrowLeft') changePage(-1);
            if (e.key === 'ArrowRight') changePage(1);
            if (e.key === '+' || e.key === '=') adjustZoom(0.25);
            if (e.key === '-' || e.key === '_') adjustZoom(-0.25);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, totalPages, pdfDoc]);


    if (!file) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 grid grid-cols-3 items-center p-2 border-b border-slate-700 gap-4 text-sm">
                    <h2 className="font-bold text-white truncate px-2" title={file.name}>{file.name}</h2>
                    
                    <div className="flex justify-center items-center gap-2">
                        <HeaderButton onClick={() => changePage(-1)} title="Previous Page (←)" disabled={currentPage <= 1}>
                             <Icon path="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
                        </HeaderButton>
                        <span className="text-slate-300 tabular-nums">Page {currentPage} / {totalPages || '--'}</span>
                        <HeaderButton onClick={() => changePage(1)} title="Next Page (→)" disabled={currentPage >= totalPages}>
                            <Icon path="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                        </HeaderButton>
                    </div>

                    <div className="flex items-center gap-1 justify-end">
                        <HeaderButton onClick={() => adjustZoom(-0.25)} title="Zoom Out (-)">
                            <Icon path="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" />
                        </HeaderButton>
                        <span className="w-16 text-center text-slate-300 font-semibold cursor-pointer" onClick={() => setZoom(1)} title="Reset Zoom">{Math.round(zoom * 100)}%</span>
                        <HeaderButton onClick={() => adjustZoom(0.25)} title="Zoom In (+)">
                             <Icon path="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
                        </HeaderButton>
                        <HeaderButton onClick={fitToPage} title="Fit to Page"><Icon path="M3 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" className="h-5 w-5" /></HeaderButton>
                        <HeaderButton onClick={fitToWidth} title="Fit to Width"><Icon path="M4 9h16M4 15h16" className="h-5 w-5" /></HeaderButton>
                        
                        <div className="border-l border-slate-700 ml-2 pl-2 flex items-center gap-1">
                             <HeaderButton onClick={handleDownload} title="Download File">
                                <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </HeaderButton>
                            <a href={file.path} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title="Open Original in New Tab">
                               <Icon path="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </a>
                            <HeaderButton onClick={onClose} title="Close (Esc)">
                                <Icon path="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                            </HeaderButton>
                        </div>
                    </div>
                </header>

                <main className="flex-grow flex overflow-hidden">
                    <aside className="w-48 flex-shrink-0 bg-slate-950/50 p-2 overflow-y-auto">
                        <div ref={thumbnailContainerRef} className="space-y-2">
                            {thumbnails.map((thumb, index) => (
                                <button key={index} onClick={() => setCurrentPage(index + 1)} className={`w-full p-1 rounded-md transition-colors ${currentPage === index + 1 ? 'bg-indigo-600/50 ring-2 ring-indigo-500' : 'hover:bg-slate-700'}`}>
                                    <img src={thumb} alt={`Page ${index + 1}`} className="w-full h-auto rounded-sm shadow-md" />
                                    <p className={`text-xs mt-1 ${currentPage === index + 1 ? 'text-white' : 'text-slate-400'}`}>{index + 1}</p>
                                </button>
                            ))}
                             {thumbnails.length === 0 && status === 'success' && [...Array(totalPages)].map((_, i) => (
                                <div key={i} className="w-full p-1"><div className="w-full aspect-[2/3] bg-slate-700 rounded-sm animate-pulse"></div></div>
                             ))}
                        </div>
                    </aside>
                    <div ref={viewerRef} className="flex-grow bg-slate-800/50 overflow-auto p-4 flex justify-center items-center relative">
                        {status === 'loading' && <div className="flex flex-col items-center text-slate-400"><Spinner /> Loading PDF...</div>}
                        {status === 'error' && <div className="text-red-400">Failed to load PDF. Please check the file URL and CORS policy.</div>}
                        {status === 'success' && (
                            <div className="relative">
                                <canvas ref={canvasRef} className="shadow-lg" />
                                {isRendering && <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center"><Spinner /></div>}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FileViewerModal;