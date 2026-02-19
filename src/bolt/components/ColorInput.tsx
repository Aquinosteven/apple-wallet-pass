interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
  const handleHexChange = (hex: string) => {
    const cleaned = hex.startsWith('#') ? hex : `#${hex}`;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(cleaned)) {
      onChange(cleaned);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer appearance-none bg-transparent p-0.5"
          />
        </div>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={7}
          className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40
            transition-shadow"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
