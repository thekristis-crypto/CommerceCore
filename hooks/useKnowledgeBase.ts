import { useState, useEffect, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { Product, GeneralKnowledgeFile, KnowledgeBase } from '../types';
import { knowledgeBaseData } from '../data/knowledgeBase';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^5.4.149/build/pdf.worker.mjs';

const CORS_PROXY_URL = 'https://corsproxy.io/?';

export const useKnowledgeBase = () => {
    const [productList, setProductList] = useState<Product[]>([]);
    const [generalKnowledgeFiles, setGeneralKnowledgeFiles] = useState<GeneralKnowledgeFile[]>([]);
    const [knowledgeFileContents, setKnowledgeFileContents] = useState<Map<string, string>>(new Map());
    const [isParsingKnowledge, setIsParsingKnowledge] = useState(true);
    const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseFile = async (file: GeneralKnowledgeFile): Promise<string> => {
        const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(file.path)}`;
        const fileResponse = await fetch(proxyUrl);
        if (!fileResponse.ok) {
            const errorBody = await fileResponse.text();
            throw new Error(`Failed to fetch ${file.name}. Status: ${fileResponse.status}. Body: ${errorBody}`);
        }
        const fileBlob = await fileResponse.blob();
        if (file.type === 'application/pdf') {
            const arrayBuffer = await fileBlob.arrayBuffer();
            const typedarray = new Uint8Array(arrayBuffer);
            const pdf = await pdfjs.getDocument(typedarray).promise;
            let content = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContentPage = await page.getTextContent();
                content += textContentPage.items.map(item => 'str' in item ? item.str : '').join(' ');
                content += '\n';
            }
            return content;
        } else if (file.type === 'text/plain') {
            return await fileBlob.text();
        }
        return '';
    };

    const fetchKnowledgeBase = useCallback(async () => {
        setIsParsingKnowledge(true);
        setError(null);
        try {
            const data: KnowledgeBase = knowledgeBaseData;
            const allFilesToParse: GeneralKnowledgeFile[] = [];
            
            setProductList(data.products || []);
            setGeneralKnowledgeFiles(data.generalKnowledge || []);

            if (data.generalKnowledge) {
                allFilesToParse.push(...data.generalKnowledge);
            }
            if (data.products) {
                data.products.forEach(p => {
                    if (p.knowledgeFiles) {
                        allFilesToParse.push(...p.knowledgeFiles);
                    }
                });
            }

            const uniqueFiles = Array.from(new Map(allFilesToParse.map(f => [f.path, f])).values());
            
            const newContents = new Map<string, string>();
            const warnings: string[] = [];

            await Promise.all(uniqueFiles.map(async file => {
                try {
                    const content = await parseFile(file);
                    newContents.set(file.path, content);
                } catch (e: any) {
                    warnings.push(`Skipping knowledge file due to parse error: "${file.name}" - ${e.message}`);
                }
            }));
            
            if (warnings.length > 0) {
                 const warningMessage = warnings.join('\n\n');
                 console.warn(warningMessage);
                 setError("Some knowledge files could not be loaded. This might affect AI responses. Please verify file URLs and permissions in `data/knowledgeBase.ts` and check the console for details.");
            }

            setKnowledgeFileContents(newContents);

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
        generalKnowledgeFiles,
        knowledgeFileContents,
        isParsingKnowledge,
        showKnowledgeModal,
        setShowKnowledgeModal,
        error
    };
};