import { DeviceType } from "./enum";
import { Media } from "./type";
import { getMediaForDevices } from "./utils";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// createVideoInjectionComposite.ts
type PIPCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type VideoInjectionOptions = {
    /** URL string or File/Blob for the injected video */
    source: string | File | Blob;

    /** Optional explicit camera deviceId; will use default camera otherwise */
    cameraDeviceId?: string;

    /** Optional explicit mic deviceId; will use default mic otherwise */
    micDeviceId?: string;

    /** Include the presenter's mic and mix it with the video audio */
    includeMicrophone?: boolean;

    /** Target FPS for the canvas capture */
    fps?: number;

    /** PiP options */
    pip?: {
        enabled?: boolean;
        height?: number;            // CSS px
        margin?: number;            // CSS px
        corner?: PIPCorner;
        radius?: number;            // CSS px, rounded PiP
        shadow?: boolean;
    };

    /** Initial gain levels (linear 0.0 - 1.0) */
    gains?: {
        video?: number;             // injected video volume into mix
        mic?: number;               // microphone volume into mix
    };

    /** Set to true if your video URL has CORS headers and you want to draw to canvas */
    crossOriginAnonymous?: boolean;
};

export type VideoInjectionComposite = {
    videoMedia: Media;
    audioMedia?: Media;

    /** Controls */
    play: () => Promise<void>;
    pause: () => void;
    seek: (timeSec: number) => void;
    isPaused: () => boolean;
    setPipEnabled: (v: boolean) => void;
    setPipCorner: (corner: PIPCorner) => void;
    setVideoGain: (g: number) => void; // 0..1
    setMicGain: (g: number) => void;   // 0..1
    /** Swap camera on the fly */
    switchCamera: (deviceId?: string) => Promise<void>;

    /** For preview if you want to append it to the DOM */
    canvas: HTMLCanvasElement;
};

export async function createVideoInjectionComposite(
    opts: VideoInjectionOptions
): Promise<VideoInjectionComposite | undefined> {
    const {
        source,
        cameraDeviceId,
        micDeviceId,
        includeMicrophone = true,
        fps = 30,
        pip = {},
        gains = {},
        crossOriginAnonymous = true,
    } = opts;

    const pipEnabled = pip.enabled ?? true;
    let pipCorner: PIPCorner = pip.corner ?? 'bottom-right';
    const pipHeight = pip.height ?? 180;
    const pipMargin = pip.margin ?? 20;
    const pipRadius = pip.radius ?? 12;
    const pipShadow = pip.shadow ?? true;

    let videoGainVal = gains.video ?? 1.0;
    let micGainVal = gains.mic ?? 1.0;

    // 1) Create media elements
    const baseVideo = document.createElement('video');
    baseVideo.playsInline = true;
    baseVideo.muted = true; // allow autoplay without gesture

    // Source can be URL or File/Blob
    if (typeof source === 'string') {
        if (crossOriginAnonymous) baseVideo.crossOrigin = 'anonymous';
        baseVideo.src = source;
    } else {
        baseVideo.src = URL.createObjectURL(source);
    }

    // 2) Camera stream (optional PiP)
    let cameraStream: MediaStream | undefined;
    let cameraTrack: MediaStreamTrack | undefined;

    const startCamera = async (deviceId?: string) => {
        try {
            const cs = await navigator.mediaDevices.getUserMedia({
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: false,
            });
            // Stop any previous
            if (cameraTrack) cameraTrack.stop();
            cameraStream?.getTracks().forEach(t => t.stop());
            cameraStream = cs;
            cameraTrack = cameraStream.getVideoTracks()[0];
            camVideo.srcObject = new MediaStream([cameraTrack]);
            await camVideo.play().catch(() => { });
        } catch (e) {
            console.warn('Camera unavailable:', e);
            cameraStream = undefined;
            cameraTrack = undefined;
        }
    };

    const camVideo = document.createElement('video');
    camVideo.playsInline = true;
    camVideo.muted = true;

    // 3) Microphone (optional) + Web Audio mix with baseVideo audio
    let audioCtx: AudioContext | undefined;
    let dest: MediaStreamAudioDestinationNode | undefined;
    let videoGain: GainNode | undefined;
    let micGain: GainNode | undefined;
    let micStream: MediaStream | undefined;

    let audioTrack: MediaStreamTrack | undefined;

    const setupAudio = async (deviceId?: string) => {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            dest = audioCtx.createMediaStreamDestination();

            // Video audio
            const videoSource = audioCtx.createMediaElementSource(baseVideo);
            videoGain = audioCtx.createGain();
            videoGain.gain.value = videoGainVal;
            videoSource.connect(videoGain).connect(dest);

            // Mic
            if (includeMicrophone) {
                const micStream = await navigator.mediaDevices.getUserMedia({
                    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
                    video: false,
                });
                const micSource = audioCtx.createMediaStreamSource(micStream);
                micGain = audioCtx.createGain();
                micGain.gain.value = micGainVal;
                micSource.connect(micGain).connect(dest);
            }

            audioTrack = dest.stream.getAudioTracks()[0];
        } catch (e) {
            console.warn('Audio setup failed. Proceeding video-only.', e);
            audioCtx = undefined;
            dest = undefined;
            videoGain = undefined;
            micGain = undefined;
            micStream = undefined;
            audioTrack = undefined;
        }
    };

    // 4) Prepare videos for drawing
    await new Promise<void>((resolve, reject) => {
        const onReady = () => resolve();
        const onErr = (e: ErrorEvent) => reject(e);
        baseVideo.addEventListener('loadedmetadata', onReady, { once: true });
        baseVideo.addEventListener('error', onErr, { once: true });
    });

    // Attempt autoplay (muted). If the source has audio you want heard, Web Audio will play it (not muted).
    await baseVideo.play().catch(() => { /* user gesture may be needed later */ });

    // Start camera (best effort)
    await startCamera(cameraDeviceId);

    // Setup audio after baseVideo is ready (so MediaElementSource is valid)
    await setupAudio(micDeviceId);

    // 5) Canvas compositor
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
        cleanupVideo();
        cleanupAudio()
        return undefined;
    }

    const updateCanvasSize = () => {
        const w = baseVideo.videoWidth || 1280;
        const h = baseVideo.videoHeight || 720;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateCanvasSize();

    // 6) Draw loop
    let running = true;
    let raf = 0;

    const roundRect = (
        x: number, y: number, w: number, h: number, r: number
    ) => {
        const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    };

    const draw = () => {
        if (!running) return;

        // Handle resize of base video
        const w = baseVideo.videoWidth;
        const h = baseVideo.videoHeight;
        if (w && h && (parseInt(canvas.style.width) !== w || parseInt(canvas.style.height) !== h)) {
            updateCanvasSize();
        }

        // Draw base video
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        if (baseVideo.readyState >= 2) {
            ctx.drawImage(baseVideo, 0, 0, canvas.width / dpr, canvas.height / dpr);
        }

        // Draw PiP camera
        if (pipEnabled && cameraTrack && camVideo.readyState >= 2) {
            const aspect = (camVideo.videoWidth || 4) / (camVideo.videoHeight || 3);
            const pipW = pipHeight * aspect;
            const pipH = pipHeight;

            let x = pipMargin;
            let y = pipMargin;
            if (pipCorner.includes('right')) x = (canvas.width / dpr) - pipW - pipMargin;
            if (pipCorner.includes('bottom')) y = (canvas.height / dpr) - pipH - pipMargin;

            ctx.save();
            if (pipShadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 4;
            }
            roundRect(x, y, pipW, pipH, pipRadius);
            ctx.clip();
            ctx.drawImage(camVideo, x, y, pipW, pipH);
            ctx.restore();
        }

        raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // 7) Export tracks: canvas video + mixed audio
    const canvasStream = canvas.captureStream(fps);
    const videoTrack = canvasStream.getVideoTracks()[0];

    // 8) Lazy import IVS
    const { LocalStageStream } = await import('amazon-ivs-web-broadcast');

    const videoStageStream = new LocalStageStream(videoTrack);
    const audioStageStream = audioTrack ? new LocalStageStream(audioTrack) : undefined;

    // 9) Controls
    const play = async () => {
        // Autoplay policies may require a user gesture if audioContext is suspended
        try {
            await baseVideo.play();
        } catch (e) {
            // ignore
            console.error(e)
        }
        if (audioCtx?.state === 'suspended') await audioCtx.resume();
    };
    const pause = () => baseVideo.pause();
    const seek = (timeSec: number) => { baseVideo.currentTime = Math.max(0, timeSec); };
    const isPaused = () => baseVideo.paused;

    const setPipEnabled = (v: boolean) => { pipEnabledRef.value = v; pipEnabledInternal = v; };
    let pipEnabledInternal = pipEnabled;
    const pipEnabledRef = { get value() { return pipEnabledInternal; }, set value(v: boolean) { pipEnabledInternal = v; } };

    const setPipCorner = (corner: PIPCorner) => { pipCorner = corner; };
    const setVideoGain = (g: number) => { videoGainVal = clamp01(g); if (videoGain) videoGain.gain.value = videoGainVal; };
    const setMicGain = (g: number) => { micGainVal = clamp01(g); if (micGain) micGain.gain.value = micGainVal; };

    const switchCamera = async (deviceId?: string) => {
        await startCamera(deviceId);
    };

    function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

    function cleanupAudio() {
        audioTrack?.stop();
        micStream?.getTracks().forEach(t => t.stop());
        // Close audio context
        try { audioCtx?.close(); } catch { }
    }

    function cleanupVideo() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        videoTrack?.stop();
        cameraTrack?.stop()
        micStream?.getTracks().forEach(t => t.stop());
        cameraStream?.getTracks().forEach(t => t.stop());
        // Revoke blob URL if used
        if (typeof source !== 'string') {
            try { URL.revokeObjectURL(baseVideo.src); } catch { }
        }
    }

    return {
        videoMedia: {
            stageStream: videoStageStream,
            track: videoTrack,
            deviceId: cameraDeviceId,
            cleanup: cleanupVideo
        },
        audioMedia: audioStageStream && audioTrack ? {
            stageStream: audioStageStream,
            track: audioTrack,
            deviceId: micDeviceId,
            cleanup: cleanupAudio
        } : undefined,
        play,
        pause,
        seek,
        isPaused,
        setPipEnabled,
        setPipCorner,
        setVideoGain,
        setMicGain,
        switchCamera,
        canvas,
    };
}

export const createScreenShareComposite = async ({
    deviceId,
}: {
    deviceId?: string;
}): Promise<Media | undefined> => {
    console.log("create composite enter");

    // Check screen sharing support
    if (!navigator.mediaDevices.getDisplayMedia) {
        console.warn("Screen sharing not supported in this browser.");
        return undefined;
    }

    // Get screen stream
    let screenStream: MediaStream;
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (e) {
        console.log("Screen share failed", e);
        return undefined;
    }
    console.log("Got screen stream");

    // Get camera stream
    let cameraStream: MediaStream;
    try {
        cameraStream = await getMediaForDevices(DeviceType.CAMERA, deviceId || "")
    } catch (e) {
        console.error("Camera access failed:", e);
        screenStream.getTracks().forEach((t) => t.stop());
        return undefined;
    }
    console.log("Got camera stream");

    // Extract video tracks
    const screenTrack = screenStream.getVideoTracks()[0];
    const cameraTrack = cameraStream.getVideoTracks()[0];

    // Set up video elements
    const screenVideo = document.createElement("video");
    const cameraVideo = document.createElement("video");

    screenVideo.srcObject = new MediaStream([screenTrack]);
    cameraVideo.srcObject = new MediaStream([cameraTrack]);
    screenVideo.muted = true;
    cameraVideo.muted = true;

    await Promise.all([screenVideo.play(), cameraVideo.play()]);

    // Create and size canvas
    const canvas = document.createElement("canvas");
    canvas.width = screenVideo.videoWidth || 1280;
    canvas.height = screenVideo.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let rafId: number;

    const draw = () => {
        if (screenVideo.readyState >= 2) {
            ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        }

        if (cameraVideo.readyState >= 2) {
            const pipHeight = 160;
            const aspect = cameraVideo.videoWidth / cameraVideo.videoHeight || 4 / 3;
            const pipWidth = pipHeight * aspect;

            ctx.drawImage(
                cameraVideo,
                canvas.width - pipWidth - 20,
                canvas.height - pipHeight - 20,
                pipWidth,
                pipHeight
            );
        }

        rafId = requestAnimationFrame(draw);
    };

    draw();

    const canvasStream = canvas.captureStream(30);
    const compositeTrack = canvasStream.getVideoTracks()[0];

    const cleanup = () => {
        console.log(`Device: ScreenShare - Cleaning up`)
        cancelAnimationFrame(rafId);
        compositeTrack.stop();
        screenTrack.stop();
        cameraTrack.stop();
    };

    const { LocalStageStream } = await import("amazon-ivs-web-broadcast");

    return {
        stageStream: new LocalStageStream(compositeTrack),
        track: compositeTrack,
        deviceId: deviceId,
        cleanup,
    };
};

