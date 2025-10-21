import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null;

const loadFfmpeg = async (): Promise<FFmpeg> => {
    if (ffmpeg) {
        return ffmpeg;
    }
    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
};

export const compressVideo = async (
    videoFile: File,
    targetSizeMB: number,
    progressCallback: (progress: number) => void,
): Promise<File> => {
    const ffmpeg = await loadFfmpeg();

    ffmpeg.on('progress', ({ progress }) => {
        progressCallback(progress);
    });

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

    let duration = 0;
    const logOutput: string[] = [];
    
    const logCallback = ({ message }: { message: string }) => {
        logOutput.push(message);
        const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (durationMatch) {
            const hours = parseInt(durationMatch[1], 10);
            const minutes = parseInt(durationMatch[2], 10);
            const seconds = parseInt(durationMatch[3], 10);
            const milliseconds = parseInt(durationMatch[4], 10);
            duration = hours * 3600 + minutes * 60 + seconds + milliseconds / 100;
        }
    };
    
    ffmpeg.on('log', logCallback);
    
    // This command won't produce an output but will log video info, including duration
    await ffmpeg.exec(['-i', inputFileName]);
    ffmpeg.off('log', logCallback);

    if (duration === 0) {
        const lastLogWithDuration = logOutput.reverse().find(line => line.includes('Duration:'));
        if(lastLogWithDuration) {
             const durationMatch = lastLogWithDuration.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
             if (durationMatch) {
                const hours = parseInt(durationMatch[1], 10);
                const minutes = parseInt(durationMatch[2], 10);
                const seconds = parseInt(durationMatch[3], 10);
                const milliseconds = parseInt(durationMatch[4], 10);
                duration = hours * 3600 + minutes * 60 + seconds + milliseconds / 100;
            }
        }
    }

    if (duration === 0) {
        throw new Error('Could not determine video duration.');
    }

    const targetBitrate = Math.floor((targetSizeMB * 8 * 1024) / duration);

    await ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-b:v', `${targetBitrate}k`,
        '-preset', 'ultrafast',
        '-an', // remove audio for analysis purposes
        outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);
    const compressedFile = new File([data], 'compressed_video.mp4', { type: 'video/mp4' });

    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    progressCallback(1);
    return compressedFile;
};

export const cancelCompression = async () => {
    if (ffmpeg && ffmpeg.loaded) {
        try {
            await ffmpeg.terminate();
        } catch (e) {
            console.error("Error terminating ffmpeg:", e);
        } finally {
            ffmpeg = null;
        }
    }
};
