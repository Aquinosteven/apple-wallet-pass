import { useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import type { FileData } from '../types/pass';

interface FileUploadProps {
  label: string;
  hint?: string;
  value: FileData | null;
  onChange: (file: FileData | null) => void;
  accept?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FileUpload({
  label,
  hint,
  value,
  onChange,
  accept = 'image/png',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    onChange({ filename: file.name, base64 });

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50/50">
          <Image className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">
            {value.filename}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 rounded-md hover:bg-gray-200/80 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-dashed border-gray-300
            rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600
            hover:bg-gray-50/50 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Choose file...</span>
        </button>
      )}
      {hint && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
