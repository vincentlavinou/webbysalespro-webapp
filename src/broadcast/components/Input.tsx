import React from 'react';

interface InputProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
}

const Input: React.FC<InputProps> = ({ label, value, onChange }) => {
  return (
    <div className="column margin-right">
      <label>{`${label}:`}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default Input;
