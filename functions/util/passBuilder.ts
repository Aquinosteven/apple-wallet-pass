interface PassData {
  formatVersion: number;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  serialNumber: string;
  logoText: string;
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
}

export function buildPassJson(
  passTypeId: string,
  teamId: string,
  orgName: string
): PassData {
  const serialNumber = `TEST-${Date.now()}`;

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    organizationName: orgName,
    description: 'Test Wallet Pass',
    serialNumber,
    logoText: 'Test Pass',
    backgroundColor: 'rgb(60, 65, 76)',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(200, 200, 200)'
  };
}
