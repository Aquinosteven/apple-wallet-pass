export function formatAdminStatus(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatAdminDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function formatPlanName(value: string | null | undefined) {
  if (!value) return 'No plan';
  return formatAdminStatus(value);
}

export function statusTone(value: string | null | undefined) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'active' || normalized === 'resolved' || normalized === 'healthy') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'watch') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'at_risk') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (normalized === 'trial' || normalized === 'queued' || normalized === 'triaged') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized === 'past_due' || normalized === 'waiting' || normalized === 'processing') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'failed' || normalized === 'canceled') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}
