import { useContext, useRef, useState } from 'react';
import { 
    getCameraStream,
    getMicrophoneStream,
    getAvailableDevices,
    getScreenshareStream,
    getIdealDevice,
    getDisconnectedDevices,
    getConnectedDevices
} from '@/broadcast/device/data/repository/MediaRepository';
import { toast } from 'react-hot-toast';
import { debounce } from '@/broadcast/utils/debounce';
import { Orientation } from '../data/model/enum';
import { MediaSettingsContext } from '../providers/MediaSettingsContext';
import { LocalMedia } from '../data/model/type';

    interface DeviceInfo {
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
    permissions: boolean;
}


function useLocalMedia() : LocalMedia {

    const {
        configRef, 
        savedAudioDeviceId, 
        setSavedAudioDeviceId, 
        savedVideoDeviceId, 
        setSavedVideoDeviceId,
        orientation
    } = useContext(MediaSettingsContext);

    const videoElemRef = useRef<HTMLVideoElement>(null);
    const canvasElemRef = useRef<HTMLCanvasElement>(null);
    const localAudioStreamRef = useRef<MediaStream | undefined>(null);
    const localVideoStreamRef = useRef<MediaStream | undefined>(null);
    const localVideoDeviceIdRef = useRef<string | null>(null);
    const localAudioDeviceIdRef = useRef<string | null>(null);
    const localScreenShareRef = useRef<MediaStream | null>(null);
    const refreshSceneRef = useRef<Function | null>(null);
  
    const [permissions, setPermissions] = useState<boolean>(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [localVideoMounted, setLocalVideoMounted] = useState<boolean>(false);
    const [localAudioMounted, setLocalAudioMounted] = useState<boolean>(false);
    const [enableCanvasCamera, setEnableCanvasCamera] = useState<boolean>(false);
  
    const setInitialDevices = async () => {
        const {
            videoDevices: _videoDevices,
            audioDevices: _audioDevices,
            permissions: _permissions,
        } = await refreshDevices();
    
        const audioDeviceId = getIdealDevice(savedAudioDeviceId, _audioDevices);
        const videoDeviceId = getIdealDevice(savedVideoDeviceId, _videoDevices);
    
        if(!audioDeviceId || !videoDeviceId) {
            toast.error('No audio or video devices found. Please connect a microphone and camera.', { id: 'DEVICE_ERROR' });
            return{
                audioDeviceId: undefined,
                audioStream: undefined,
                videoDeviceId: undefined,
                videoStream: undefined,
            };
        }
        
        const audioStream = await updateLocalAudio(audioDeviceId);
        const videoStream = await updateLocalVideo(videoDeviceId);
    
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
        return { audioDeviceId, audioStream, videoDeviceId, videoStream };
    };

    const cleanUpDevices = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };

    const refreshDevices = async (e?: Event): Promise<DeviceInfo> => {
        const isDeviceChange = e?.type === 'devicechange';
    
        const {
            videoDevices: _videoDevices,
            audioDevices: _audioDevices,
            permissions,
        } = await getAvailableDevices({ savedAudioDeviceId, savedVideoDeviceId });
    
        const formattedAudioDevices = _audioDevices.map((device) => ({
        label: device.label,
        dev: device.deviceId,
        }));
        const formattedVideoDevices = _videoDevices.map((device) => ({
        label: device.label,
        value: device.deviceId,
        }));
    
        let newAudioDevice: MediaDeviceInfo | undefined;
        let newVideoDevice: MediaDeviceInfo | undefined;
    
        setAudioDevices((prevState) => {
            if (!isDeviceChange) return _audioDevices;
            if (prevState.length > _audioDevices.length) {
                const [disconnectedDevice] = getDisconnectedDevices(prevState, _audioDevices);
                if (disconnectedDevice?.deviceId === localAudioDeviceIdRef.current) {
                    newAudioDevice = _audioDevices.find(({ deviceId }) => deviceId === 'default') || _audioDevices[0];
                }
                toast.error(`Device disconnected: ${disconnectedDevice?.label}`, { id: 'MIC_DEVICE_UPDATE' });
            } else if (prevState.length < formattedAudioDevices.length) {
                const [connectedDevice] = getConnectedDevices(prevState, _audioDevices);
                toast.success(`Device connected: ${connectedDevice?.label}`, { id: 'MIC_DEVICE_UPDATE' });
            }
            return _audioDevices;
        });
    
        setVideoDevices((prevState) => {
            if (!isDeviceChange) return _videoDevices;
            if (prevState.length > _videoDevices.length) {
                const [disconnectedDevice] = getDisconnectedDevices(prevState, _videoDevices);
                if (disconnectedDevice?.deviceId === localVideoDeviceIdRef.current) {
                    newVideoDevice = _videoDevices.find(({ deviceId }) => deviceId === 'default') || _videoDevices[0];
                }
                toast.error(`Device disconnected: ${disconnectedDevice?.label}`, { id: 'CAM_DEVICE_UPDATE' });
            } else if (prevState.length < formattedVideoDevices.length) {
                const [connectedDevice] = getConnectedDevices(prevState, _videoDevices);
                toast.success(`Device connected: ${connectedDevice?.label}`, { id: 'CAM_DEVICE_UPDATE' });
            }
            return _videoDevices;
        });
    
        let newAudioStream, newVideoStream;
        if (newAudioDevice) newAudioStream = await updateLocalAudio(newAudioDevice.deviceId);
        if (newVideoDevice) newVideoStream = await updateLocalVideo(newVideoDevice.deviceId);
    
        if (refreshSceneRef.current) {
            const newParams: Record<string, any> = {};
            if (newAudioStream) newParams.micContent = newAudioStream;
            if (newAudioDevice) newParams.micId = newAudioDevice.deviceId;
            if (newVideoStream) newParams.cameraContent = newVideoStream;
            if (newVideoDevice) newParams.cameraId = newVideoDevice.deviceId;
            refreshSceneRef.current(newParams);
        }
    
        setPermissions(permissions);
    
        return {
            audioDevices: _audioDevices,
            videoDevices: _videoDevices,
            permissions,
        };
    };

    const updateLocalAudio = async (deviceId: string, _audioDevices = audioDevices) => {
        
        try {
            localAudioStreamRef.current?.getTracks()[0]?.stop();
        } catch (err) {
            console.error(err);
        }
        const audioStream = await setLocalAudioFromId(deviceId);
        localAudioDeviceIdRef.current = deviceId;
        setSavedAudioDeviceId(deviceId);
    
        const device = _audioDevices.find((device) => device.deviceId === deviceId);
        if (device) {
        toast.success(`Changed mic: ${device.label}`, { id: 'MIC_DEVICE_UPDATE', duration: 5000 });
        }
    
        return audioStream;
    };

    const updateLocalVideo = async (deviceId: string, _videoDevices = videoDevices) => {
        try {
        localVideoStreamRef.current?.getTracks()[0]?.stop();
        } catch (err) {
        console.error(err);
        }
    
        const videoStream = await setLocalVideoFromId(deviceId);
        localVideoDeviceIdRef.current = deviceId;
        setSavedVideoDeviceId(deviceId);
    
        const device = _videoDevices.find((device) => device.deviceId === deviceId);
        if (device) {
        toast.success(`Changed camera: ${device.label}`, { id: 'CAM_DEVICE_UPDATE', duration: 5000 });
        }
    
        return videoStream;
    };

    const startScreenShare = async () => {
        try {
        const screenShareStream = await getScreenshareStream();
        localScreenShareRef.current = screenShareStream;
        return screenShareStream;
        } catch (err) {
        console.error(err);
        }
    };

    const stopScreenShare = async () => {
        if (localScreenShareRef.current?.getTracks()) {
        for (const track of localScreenShareRef.current.getTracks()) {
            track.stop();
        }
        }
    };

    const setLocalVideoFromId = async (deviceId: string) => {
        const _config = configRef?.current.maxResolution || { width: 1280, height: 720 };
        const videoStream = await getCameraStream({
            deviceId,
            width: _config.width,
            height: _config.height,
            facingMode: 'environment',
            frameRate: 30,
            aspectRatio: orientation === Orientation.LANDSCAPE ? 16 / 9 : 9 / 16,
        });
        localVideoStreamRef.current = videoStream;
        if (!localVideoMounted) setLocalVideoMounted(true);
        return videoStream;
    };

    const setLocalAudioFromId = async (deviceId: string) => {
        const audioStream = await getMicrophoneStream(deviceId);
        localAudioStreamRef.current = audioStream;
        if (!localAudioMounted) setLocalAudioMounted(true);
        return audioStream;
    };

    const handleDeviceChange = debounce(refreshDevices, 1000);

    return {
        permissions,
        localVideoMounted,
        localAudioMounted,
        audioDevices,
        videoDevices,
        localAudioStreamRef,
        localVideoStreamRef,
        localAudioDeviceId: savedAudioDeviceId,
        localVideoDeviceId: savedVideoDeviceId,
        videoElemRef,
        canvasElemRef,
        refreshSceneRef,
        localScreenShareStreamRef: localScreenShareRef,
        enableCanvasCamera,
        setEnableCanvasCamera,
        updateLocalAudio,
        updateLocalVideo,
        setInitialDevices,
        cleanUpDevices,
        refreshDevices,
        setAudioDevices,
        setVideoDevices,
        startScreenShare,
        stopScreenShare,
      };
}

export default useLocalMedia;