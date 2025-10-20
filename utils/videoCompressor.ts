// FIX: Implemented the missing compressVideo function to resolve the import error in App.tsx.
// The previous content was a duplicate of fileAnalysis.ts and has been replaced.

/**
 * Compresses a video file by resizing and re-encoding it using browser APIs.
 *
 * @param file The video File object to compress.
 * @param onProgress A callback function that receives the compression progress as a number from 0 to 1.
 * @returns A Promise that resolves with the compressed video as a new File object.
 */
export const compressVideo = (
  file: File,
  onProgress: (progress: number) => void
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      URL.revokeObjectURL(videoUrl);
      return reject(new Error('Could not get 2D context from canvas.'));
    }

    video.onloadedmetadata = () => {
      const MAX_WIDTH = 1280;
      let { videoWidth, videoHeight } = video;

      if (videoWidth > MAX_WIDTH) {
        const scale = MAX_WIDTH / videoWidth;
        videoWidth = MAX_WIDTH;
        videoHeight *= scale;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const stream = canvas.captureStream();
      const mimeType = 'video/webm;codecs=vp8';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        URL.revokeObjectURL(videoUrl);
        return reject(new Error(`${mimeType} is not supported.`));
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: mimeType });
        const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.webm';
        const compressedFile = new File([compressedBlob], newFileName, { type: mimeType });
        URL.revokeObjectURL(videoUrl);
        resolve(compressedFile);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        reject(e);
      };

      recorder.start();

      video.play().catch(reject);

      const update = () => {
        if (video.paused || video.ended) {
          if (recorder.state === "recording") {
            recorder.stop();
          }
          onProgress(1);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        onProgress(video.currentTime / video.duration);
        requestAnimationFrame(update);
      };

      requestAnimationFrame(update);
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video for compression.'));
    };

    video.src = videoUrl;
  });
};
