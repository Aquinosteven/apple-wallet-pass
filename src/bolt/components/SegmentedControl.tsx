import { useId } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const id = useId();

  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200
              ${
                isActive
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
