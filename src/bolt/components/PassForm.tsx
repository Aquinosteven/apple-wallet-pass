import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { PassFormData, PassType, Notification } from '../types/pass';
import SegmentedControl from './SegmentedControl';
import ColorInput from './ColorInput';
import FileUpload from './FileUpload';
import Toast from './Toast';

const PASS_TYPE_OPTIONS: { value: PassType; label: string }[] = [
  { value: 'generic', label: 'Generic' },
  { value: 'onlineEvent', label: 'Online Event' },
];

interface PassFormProps {
  formData: PassFormData;
  loading: boolean;
  notification: Notification | null;
  onUpdate: <K extends keyof PassFormData>(key: K, value: PassFormData[K]) => void;
  onSubmit: () => void;
  onReset: () => void;
  onDismissNotification: () => void;
}

export default function PassForm({
  formData,
  loading,
  notification,
  onUpdate,
  onSubmit,
  onReset,
  onDismissNotification,
}: PassFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Pass Details</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Pass Type
          </label>
          <SegmentedControl
            options={PASS_TYPE_OPTIONS}
            value={formData.passType}
            onChange={(v) => onUpdate('passType', v)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onUpdate('title', e.target.value)}
            placeholder="e.g. VIP Admission"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Subtitle
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => onUpdate('subtitle', e.target.value)}
            placeholder="e.g. Front Row, Section A"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Organization
          </label>
          <input
            type="text"
            value={formData.organization}
            onChange={(e) => onUpdate('organization', e.target.value)}
            placeholder="e.g. Acme Events Inc."
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorInput
            label="Background Color"
            value={formData.backgroundColor}
            onChange={(v) => onUpdate('backgroundColor', v)}
          />
          <ColorInput
            label="Text Color"
            value={formData.foregroundColor}
            onChange={(v) => onUpdate('foregroundColor', v)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileUpload
            label="Logo"
            hint="Square PNG, recommended 160x50"
            value={formData.logo}
            onChange={(v) => onUpdate('logo', v)}
          />
          <FileUpload
            label="Strip Image"
            hint="1125x243 PNG, RGB only"
            value={formData.strip}
            onChange={(v) => onUpdate('strip', v)}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
            Advanced
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => onUpdate('serialNumber', e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  placeholder="Accessibility description for VoiceOver"
                  rows={2}
                  className="input resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Relevant Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.relevantDate}
                  onChange={(e) => onUpdate('relevantDate', e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div className="mt-5">
          <Toast notification={notification} onDismiss={onDismissNotification} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Generating...' : 'Generate Pass'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="btn-secondary"
        >
          Reset
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Generates a .pkpass file via <code className="text-gray-500">/api/client-pass</code>
      </p>
    </form>
  );
}
