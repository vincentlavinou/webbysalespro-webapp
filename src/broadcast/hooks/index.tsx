'use client'
import { useEffect, useState } from "react";
import { getDevices } from "@broadcast/service/utils";

export const useMediaDevices = () => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { audioDevices, videoDevices } = await getDevices();
      setAudioDevices(audioDevices);
      setVideoDevices(videoDevices);
      setAudioId(audioDevices[0]?.deviceId || null);
      setVideoId(videoDevices[0]?.deviceId || null);
    };
    init();
  }, []);

  return {
    audioDevices,
    videoDevices,
    audioId,
    videoId,
    setAudioId,
    setVideoId,
  };
};
