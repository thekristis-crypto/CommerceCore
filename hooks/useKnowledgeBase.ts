

import { useState, useEffect, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { Product, GeneralKnowledgeFile, KnowledgeBase } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^5.4.149/build/pdf.worker.mjs';

const BACKEND_URL = 'https://ad-iteration-backend.onrender.com';

/**
 * A wrapper for the fetch API that automatically retries on network failures or transient server errors (5xx).
 * This is useful for dealing with backend services that may be slow to start up (e.g., on Render's free tier).
 * @param url The URL to fetch.
 * @param retries The number of times to retry.
 * @param delay The delay between retries in milliseconds.
 * @returns A Promise that resolves to the Response object.
 */
const fetchWithRetry = async (url: string, retries = 5, delay = 3000): Promise<Response> => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            // If the response is successful (2xx) or a client error (4xx that shouldn't be retried), we return it.
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }
            // For server errors (5xx), we'll log it and trigger a retry.
            lastError = new Error(`Server responded with status: ${response.status}`);
        } catch (error) {
            // This catches network-level errors, like "Failed to fetch"
            lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (i < retries - 1) {
            console.warn(`Fetch attempt ${i + 1} for ${url} failed with error: ${lastError?.message}. Retrying in ${delay / 1000}s...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    // After all retries, throw the last recorded error.
    throw lastError || new Error('All fetch attempts failed.');
};


export const useKnowledgeBase = () => {
    const [productList, setProductList] = useState<Product[]>([]);
    const [persistedKnowledgeFiles, setPersistedKnowledgeFiles] = useState<GeneralKnowledgeFile[]>([]);
    const [knowledgeBaseContent, setKnowledgeBaseContent] = useState<string | null>(null);
    const [isParsingKnowledge, setIsParsingKnowledge] = useState(true);
    const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchKnowledgeBase = useCallback(async () => {
        setIsParsingKnowledge(true);
        setError(null);
        try {
            const response = await fetchWithRetry(`${BACKEND_URL}/api/knowledge`);
            
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            
            const data: KnowledgeBase = await response.json();
            
            setProductList(data.products || []);

            if (data.generalKnowledge && data.generalKnowledge.length > 0) {
                setPersistedKnowledgeFiles(data.generalKnowledge);
                let combinedContent = '';

                for (const file of data.generalKnowledge) {
                    try {
                        const filePath = file.path;
                        const fileResponse = await fetch(filePath);
                         if (!fileResponse.ok) {
                            console.warn(`Could not fetch knowledge file: ${file.name} (status: ${fileResponse.status})`);
                            continue;
                        }
                        const fileBlob = await fileResponse.blob();
                        
                        if (file.type === 'application/pdf') {
                            const arrayBuffer = await fileBlob.arrayBuffer();
                            const typedarray = new Uint8Array(arrayBuffer);
                            const pdf = await pdfjs.getDocument(typedarray).promise;
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContentPage = await page.getTextContent();
                                combinedContent += textContentPage.items.map(item => 'str' in item ? item.str : '').join(' ');
                                combinedContent += '\n\n';
                            }
                        } else if (file.type === 'text/plain') {
                            combinedContent += await fileBlob.text();
                            combinedContent += '\n\n';
                        }
                    } catch(e) {
                        console.warn(`Skipping knowledge file due to parse error: ${file.name}`, e);
                    }
                }
                setKnowledgeBaseContent(combinedContent.trim());
            } else {
                 setPersistedKnowledgeFiles([]);
                 setKnowledgeBaseContent(null);
            }
        } catch (e) {
            console.error("Failed to fetch knowledge base:", e);
            setError("Failed to connect to the backend server. This can happen if the service is starting up (common on free tiers). Please wait a moment and refresh. If the problem persists, verify the backend is running and the URL is correct.");
        } finally {
            setIsParsingKnowledge(false);
        }
    }, []);

    useEffect(() => {
        fetchKnowledgeBase();
    }, [fetchKnowledgeBase]);

    return {
        productList,
        persistedKnowledgeFiles,
        knowledgeBaseContent,
        isParsingKnowledge,
        showKnowledgeModal,
        setShowKnowledgeModal,
        error
    };
};
