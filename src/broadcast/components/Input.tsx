import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

const Input = ({ label, value, onChange, type = "text", placeholder, disabled }: Props) => {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <ShadInput
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};

export default Input;
