interface CertificateData {
  p12Buffer: Buffer;
  wwdrBuffer: Buffer;
  password: string;
  passTypeId: string;
  teamId: string;
  orgName: string;
}

interface CertificateHealth {
  ok: boolean;
  hasP12: boolean;
  hasWWDR: boolean;
  passTypeId?: string;
  teamId?: string;
  orgName?: string;
  error?: string;
}

export function checkCertificateHealth(): CertificateHealth {
  try {
    const passTypeId = process.env.APPLE_PASS_TYPE_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    const orgName = process.env.APPLE_ORG_NAME;
    const p12Base64 = process.env.PASS_P12;
    const password = process.env.PASS_P12_PASSWORD;
    const wwdrBase64 = process.env.WWDR_PEM;

    const hasP12 = !!(p12Base64 && password);
    const hasWWDR = !!wwdrBase64;

    if (!passTypeId || !teamId || !orgName) {
      return {
        ok: false,
        hasP12,
        hasWWDR,
        passTypeId,
        teamId,
        orgName,
        error: 'Missing required credentials: APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, or APPLE_ORG_NAME'
      };
    }

    if (!hasP12) {
      return {
        ok: false,
        hasP12,
        hasWWDR,
        passTypeId,
        teamId,
        orgName,
        error: 'Missing P12 certificate or password: PASS_P12 or PASS_P12_PASSWORD'
      };
    }

    if (!hasWWDR) {
      return {
        ok: false,
        hasP12,
        hasWWDR,
        passTypeId,
        teamId,
        orgName,
        error: 'Missing WWDR certificate: WWDR_PEM'
      };
    }

    try {
      Buffer.from(p12Base64, 'base64');
    } catch (e) {
      return {
        ok: false,
        hasP12: false,
        hasWWDR,
        passTypeId,
        teamId,
        orgName,
        error: 'Invalid base64 encoding in PASS_P12'
      };
    }

    try {
      Buffer.from(wwdrBase64, 'base64');
    } catch (e) {
      return {
        ok: false,
        hasP12,
        hasWWDR: false,
        passTypeId,
        teamId,
        orgName,
        error: 'Invalid base64 encoding in WWDR_PEM'
      };
    }

    return {
      ok: true,
      hasP12: true,
      hasWWDR: true,
      passTypeId,
      teamId,
      orgName
    };
  } catch (error) {
    return {
      ok: false,
      hasP12: false,
      hasWWDR: false,
      error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function loadCertificates(): CertificateData {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const orgName = process.env.APPLE_ORG_NAME;
  const p12Base64 = process.env.PASS_P12;
  const password = process.env.PASS_P12_PASSWORD;
  const wwdrBase64 = process.env.WWDR_PEM;

  if (!passTypeId) {
    throw new Error('Missing environment variable: APPLE_PASS_TYPE_ID');
  }

  if (!teamId) {
    throw new Error('Missing environment variable: APPLE_TEAM_ID');
  }

  if (!orgName) {
    throw new Error('Missing environment variable: APPLE_ORG_NAME');
  }

  if (!p12Base64) {
    throw new Error('Missing environment variable: PASS_P12');
  }

  if (!password) {
    throw new Error('Missing environment variable: PASS_P12_PASSWORD');
  }

  if (!wwdrBase64) {
    throw new Error('Missing environment variable: WWDR_PEM');
  }

  let p12Buffer: Buffer;
  let wwdrBuffer: Buffer;

  try {
    p12Buffer = Buffer.from(p12Base64, 'base64');
  } catch (error) {
    throw new Error(`Failed to decode PASS_P12: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    wwdrBuffer = Buffer.from(wwdrBase64, 'base64');
  } catch (error) {
    throw new Error(`Failed to decode WWDR_PEM: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    p12Buffer,
    wwdrBuffer,
    password,
    passTypeId,
    teamId,
    orgName
  };
}
