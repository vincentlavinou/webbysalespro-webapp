import { Label } from "@/components/ui/label";
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mic, MicOff, VideoIcon, VideoOffIcon } from "lucide-react";
import { DeviceType } from "../../service/enum";
import { useLocalMediaDevices } from "../../hooks";
import { useLocalMedia } from "../../hooks/use-strategy";

interface Props {
  deviceType: "Camera" | "Microphone";
  devices: MediaDeviceInfo[];
  updateDevice: (id: string) => void;
}

const Select = ({ deviceType, devices, updateDevice }: Props) => {
  return (
    <div className="space-y-1">
      <Label>{deviceType}</Label>
      <ShadSelect onValueChange={(val) => updateDevice(val)}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${deviceType}`} />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `${deviceType} ${device.deviceId.slice(-4)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>
  );
};

export default Select;



export function SelectCamera() {
  const { videoDevices, setVideoId, videoIsMuted, selectedVideoId } = useLocalMediaDevices();
  const { toggleMedia } = useLocalMedia()

  return (
    <div className="flex gap-2 items-center">
      {videoIsMuted ? 
                <VideoOffIcon className="w-6 h-6 text-red-500 animate-in" onClick={() => toggleMedia(DeviceType.CAMERA)} /> 
              : <VideoIcon className="w-6 h-6 text-green-500 animate-in" onClick={() => toggleMedia(DeviceType.CAMERA)}/>
      }
      <ShadSelect onValueChange={(val) => setVideoId(val)} value={selectedVideoId || ""}>
        <SelectTrigger className="">
          {/* <VideoIcon className="w-8 h-8" /> */}
        </SelectTrigger>
        <SelectContent side="top">
          {videoDevices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>{device.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>

  )
}


export function SelectMicrophone() {

  const { audioDevices, setAudioId, audioIsMuted, selectedAudioId } = useLocalMediaDevices();
  const { toggleMedia } = useLocalMedia()

  return (
    <div className="flex gap-2 items-center">
      {audioIsMuted ? <MicOff className="w-6 h-6 text-red-500 animate-in" onClick={() => toggleMedia(DeviceType.MIC)} /> 
              : <Mic className="w-6 h-6 text-green-500 animate-in" onClick={() => toggleMedia(DeviceType.MIC)}/>
      }
      <ShadSelect onValueChange={(val) => setAudioId(val)} value={selectedAudioId || ""}>
        <SelectTrigger className="">
        </SelectTrigger>
        <SelectContent side="top">
          {audioDevices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              <div className="flex items-center gap-2">
                <Mic className="w-8 h-8 text-black" />
                <span>{device.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>
  )
}

