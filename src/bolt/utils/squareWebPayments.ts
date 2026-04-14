export type SquareTokenizeResult = {
  status: string;
  token?: string;
  errors?: Array<{ message?: string }>;
};

export type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: (verificationDetails: Record<string, unknown>) => Promise<SquareTokenizeResult>;
  destroy?: () => Promise<void> | void;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

const squareScriptPromises = new Map<string, Promise<void>>();

export function getSquareScriptUrl(environment: string | null): string {
  return environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';
}

export function loadSquareScript(environment: string | null): Promise<void> {
  const src = getSquareScriptUrl(environment);
  const existingPromise = squareScriptPromises.get(src);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existingScript) {
      if (window.Square) {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Square checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Square checkout.'));
    document.head.appendChild(script);
  });

  squareScriptPromises.set(src, promise);
  return promise;
}

export function centsToAmountString(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}
