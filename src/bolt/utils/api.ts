import type { PassFormData, ApiErrorResponse } from '../types/pass';

const API_ENDPOINT = '/api/client-pass';

interface PassPayload {
  passType: string;
  title: string;
  subtitle?: string;
  organization?: string;
  backgroundColor: string;
  foregroundColor: string;
  serialNumber?: string;
  description?: string;
  relevantDate?: string;
  logo?: { filename: string; base64: string };
  strip?: { filename: string; base64: string };
}

function buildPayload(data: PassFormData): PassPayload {
  const payload: PassPayload = {
    passType: data.passType,
    title: data.title,
    backgroundColor: data.backgroundColor,
    foregroundColor: data.foregroundColor,
  };

  if (data.subtitle) payload.subtitle = data.subtitle;
  if (data.organization) payload.organization = data.organization;
  if (data.serialNumber) payload.serialNumber = data.serialNumber;
  if (data.description) payload.description = data.description;
  if (data.relevantDate) payload.relevantDate = data.relevantDate;
  if (data.logo) payload.logo = data.logo;
  if (data.strip) payload.strip = data.strip;

  return payload;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generatePass(data: PassFormData): Promise<void> {
  const payload = buildPayload(data);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    const blob = await response.blob();
    downloadBlob(blob, 'pass.pkpass');
    return;
  }

  const text = await response.text();
  let parsed: ApiErrorResponse;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: text || `Request failed (${response.status})` };
  }

  throw parsed;
}
