export type PerformanceBand = 'no_data' | 'low' | 'medium' | 'high' | 'excellent';

export interface PercentagePerformance {
  band: PerformanceBand;
  label: string;
  rate: number | null;
  formattedRate: string;
  badgeClassName: string;
  textClassName: string;
}

const bandStyles: Record<PerformanceBand, { label: string; badgeClassName: string; textClassName: string }> = {
  no_data: {
    label: 'No data',
    badgeClassName: 'bg-gray-100 text-gray-500',
    textClassName: 'text-gray-500',
  },
  low: {
    label: 'Low',
    badgeClassName: 'bg-red-50 text-red-700',
    textClassName: 'text-red-700',
  },
  medium: {
    label: 'Medium',
    badgeClassName: 'bg-amber-50 text-amber-700',
    textClassName: 'text-amber-700',
  },
  high: {
    label: 'High',
    badgeClassName: 'bg-ggreen/10 text-ggreen',
    textClassName: 'text-ggreen',
  },
  excellent: {
    label: 'Excellent',
    badgeClassName: 'bg-gblue/10 text-gblue',
    textClassName: 'text-gblue',
  },
};

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${rate.toFixed(1)}%`;
}

function getPercentagePerformanceBand(rate: number | null): PerformanceBand {
  if (rate === null) return 'no_data';
  if (rate < 15) return 'low';
  if (rate < 45) return 'medium';
  if (rate < 75) return 'high';
  return 'excellent';
}

function getPercentagePerformance(numerator: number, denominator: number): PercentagePerformance {
  const safeNumerator = Math.max(Number(numerator) || 0, 0);
  const safeDenominator = Math.max(Number(denominator) || 0, 0);
  const rate = safeDenominator > 0 ? (safeNumerator / safeDenominator) * 100 : null;
  const band = getPercentagePerformanceBand(rate);
  const style = bandStyles[band];

  return {
    band,
    label: style.label,
    rate,
    formattedRate: formatRate(rate),
    badgeClassName: style.badgeClassName,
    textClassName: style.textClassName,
  };
}

export function getTicketToPhoneAddPerformance(walletAdds: number, ticketsGenerated: number): PercentagePerformance {
  return getPercentagePerformance(walletAdds, ticketsGenerated);
}

export function getTicketToClaimPerformance(claimedPasses: number, ticketsGenerated: number): PercentagePerformance {
  return getPercentagePerformance(claimedPasses, ticketsGenerated);
}

export function getClaimToPhoneAddPerformance(walletAdds: number, claimedPasses: number): PercentagePerformance {
  return getPercentagePerformance(walletAdds, claimedPasses);
}
