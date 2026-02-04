import PKPass from 'npm:passkit-generator@3.5.5';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCertificates } from '../util/certificates';
import { buildPassJson } from '../util/passBuilder';

export async function onRequest() {
  try {
    const certs = loadCertificates();

    const passData = buildPassJson(
      certs.passTypeId,
      certs.teamId,
      certs.orgName
    );

    const pass = new PKPass(
      {
        'pass.json': Buffer.from(JSON.stringify(passData))
      },
      {
        signerCert: certs.p12Buffer,
        signerPass: certs.password,
        wwdr: certs.wwdrBuffer
      }
    );

    const iconPath = join(process.cwd(), 'functions', 'assets', 'icon.png');
    const logoPath = join(process.cwd(), 'functions', 'assets', 'logo.png');

    const iconBuffer = readFileSync(iconPath);
    const logoBuffer = readFileSync(logoPath);

    pass.addBuffer('icon.png', iconBuffer);
    pass.addBuffer('logo.png', logoBuffer);

    const pkpassBuffer = pass.getAsBuffer();

    return new Response(pkpassBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename="test.pkpass"',
        'Content-Length': pkpassBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Pass generation error:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
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
