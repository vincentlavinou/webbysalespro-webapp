import React from 'react';

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface SelectProps {
  deviceType: string;
  devices: MediaDevice[];
  updateDevice: (deviceId: string) => void;
}

const Select: React.FC<SelectProps> = ({ deviceType, devices, updateDevice }) => {
  return (
    <div className="column">
      <label>{`Select ${deviceType}:`}</label>
      <select onChange={(e) => updateDevice(e.target.value)}>
        {devices?.map((device) => (
          <option
            key={`${deviceType.charAt(0).toLowerCase() + deviceType.slice(1)}-${device.deviceId}`}
            value={device.deviceId}
          >
            {device.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
