import { checkCertificateHealth } from '../util/certificates';

export async function onRequest() {
  try {
    const health = checkCertificateHealth();

    const status = health.ok ? 200 : 500;

    return new Response(JSON.stringify(health, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
