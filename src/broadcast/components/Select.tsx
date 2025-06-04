import { Label } from "@/components/ui/label";
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
