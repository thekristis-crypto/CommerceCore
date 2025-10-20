import { useState, useEffect, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { Product, GeneralKnowledgeFile, KnowledgeBase } from '../types';
import { knowledgeBaseData } from '../data/knowledgeBase';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^5.4.149/build/pdf.worker.mjs';

// A reliable public CORS proxy to fetch files from cloud storage without needing a custom backend.
const CORS_PROXY_URL = 'https://corsproxy.io/?';

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
            const data: KnowledgeBase = knowledgeBaseData;
            
            setProductList(data.products || []);

            if (data.generalKnowledge && data.generalKnowledge.length > 0) {
                setPersistedKnowledgeFiles(data.generalKnowledge);
                let combinedContent = '';
                const warnings: string[] = [];

                for (const file of data.generalKnowledge) {
                    try {
                        // Fetch the file through a public CORS proxy to avoid CORS issues.
                        const proxyUrl = `${CORS_PROXY_URL}${file.path}`;
                        const fileResponse = await fetch(proxyUrl);
                         if (!fileResponse.ok) {
                            const errorText = await fileResponse.text();
                            warnings.push(`Skipping knowledge file due to parse error: ${file.name}. Status: ${fileResponse.status}. Error: ${errorText}`);
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
                    } catch(e: any) {
                        warnings.push(`Skipping knowledge file due to parse error: ${file.name}"  "${e.message}`);
                    }
                }
                
                if (warnings.length > 0) {
                    console.warn(warnings.join('\n'));
                }

                setKnowledgeBaseContent(combinedContent.trim());
            } else {
                 setPersistedKnowledgeFiles([]);
                 setKnowledgeBaseContent(null);
            }
        } catch (e) {
            console.error("Failed to process knowledge base:", e);
            setError("Failed to process the local knowledge base. Please check the data format.");
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
