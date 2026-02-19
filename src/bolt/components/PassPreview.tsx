import { useMemo } from 'react';
import { Wallet, Barcode } from 'lucide-react';
import type { PassFormData } from '../types/pass';

interface PassPreviewProps {
  formData: PassFormData;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default function PassPreview({ formData }: PassPreviewProps) {
  const logoUrl = useMemo(() => {
    if (!formData.logo) return null;
    return `data:image/png;base64,${formData.logo.base64}`;
  }, [formData.logo]);

  const stripUrl = useMemo(() => {
    if (!formData.strip) return null;
    return `data:image/png;base64,${formData.strip.base64}`;
  }, [formData.strip]);

  const bgColor = formData.backgroundColor || '#0B1F3B';
  const fgColor = formData.foregroundColor || getContrastColor(bgColor);

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Live Preview</h2>

      <div className="flex justify-center">
        <div
          className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-lg transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-7 max-w-[120px] object-contain"
              />
            ) : (
              <div
                className="flex items-center gap-2 opacity-60"
                style={{ color: fgColor }}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium tracking-wide uppercase">
                  {formData.organization || 'Your Logo'}
                </span>
              </div>
            )}
            <span
              className="text-[10px] font-medium opacity-40 uppercase tracking-wider"
              style={{ color: fgColor }}
            >
              {formData.passType === 'onlineEvent' ? 'Event' : 'Pass'}
            </span>
          </div>

          {stripUrl ? (
            <div className="w-full aspect-[1125/243] overflow-hidden">
              <img
                src={stripUrl}
                alt="Strip"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-full aspect-[1125/243] flex items-center justify-center"
              style={{
                backgroundColor: `${fgColor}08`,
              }}
            >
              <span
                className="text-xs opacity-20 font-medium"
                style={{ color: fgColor }}
              >
                Strip Image
              </span>
            </div>
          )}

          <div className="px-5 py-4">
            <p
              className="text-lg font-semibold leading-tight transition-all duration-200"
              style={{ color: fgColor }}
            >
              {formData.title || 'Pass Title'}
            </p>
            {(formData.subtitle || !formData.title) && (
              <p
                className="text-sm mt-1 opacity-60 transition-all duration-200"
                style={{ color: fgColor }}
              >
                {formData.subtitle || 'Subtitle'}
              </p>
            )}
          </div>

          {formData.passType === 'onlineEvent' && formData.relevantDate && (
            <div className="px-5 pb-3">
              <p
                className="text-[10px] uppercase tracking-wider font-medium opacity-40"
                style={{ color: fgColor }}
              >
                Date
              </p>
              <p
                className="text-sm mt-0.5 opacity-70"
                style={{ color: fgColor }}
              >
                {new Date(formData.relevantDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          <div className="px-5 pb-5 pt-2">
            <div
              className="rounded-xl p-4 flex flex-col items-center gap-2"
              style={{ backgroundColor: `${fgColor}0A` }}
            >
              <Barcode className="w-full h-10 opacity-20" style={{ color: fgColor }} />
              <span
                className="text-[10px] font-mono opacity-30 tracking-widest"
                style={{ color: fgColor }}
              >
                {formData.serialNumber || '0000 0000 0000'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          Preview is a stylized mock, not an actual Apple Wallet pass
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          Strip must be 1125x243 PNG, RGB only
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          Logo should be a square PNG, recommended 160x50
        </div>
      </div>
    </div>
  );
}
