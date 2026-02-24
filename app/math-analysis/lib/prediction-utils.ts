export interface PredictionLike {
  draw_date: string;
  matches: number;
}

export interface SessionSummary {
  totalSessions: number;
  totalCost: number;
  totalWinnings: number;
  netProfit: number;
  jackpotWins: number;
}

export const parseDrawDate = (value: string): number => {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const fallback = new Date(year, month - 1, day).getTime();
  return Number.isNaN(fallback) ? Number.NEGATIVE_INFINITY : fallback;
};

export const formatDateInput = (timestamp: number): string => {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const sortPredictionsByDrawDateDesc = <T extends { draw_date: string }>(predictions: T[]): T[] =>
  [...predictions].sort((a, b) => parseDrawDate(b.draw_date) - parseDrawDate(a.draw_date));

export const getPredictionDateBounds = <T extends { draw_date: string }>(predictions: T[]) => {
  const timestamps = predictions
    .map((pred) => parseDrawDate(pred.draw_date))
    .filter((ts) => Number.isFinite(ts));

  if (timestamps.length === 0) {
    return { min: '', max: '' };
  }

  return {
    min: formatDateInput(Math.min(...timestamps)),
    max: formatDateInput(Math.max(...timestamps)),
  };
};

export const filterPredictionsByDateRange = <T extends { draw_date: string }>(
  predictions: T[],
  dateFrom: string,
  dateTo: string
): T[] => {
  const fromTs = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
  const toTs = dateTo ? Date.parse(`${dateTo}T23:59:59.999`) : null;
  const minTs = fromTs !== null && toTs !== null ? Math.min(fromTs, toTs) : fromTs;
  const maxTs = fromTs !== null && toTs !== null ? Math.max(fromTs, toTs) : toTs;

  return predictions.filter((pred) => {
    const drawTs = parseDrawDate(pred.draw_date);
    if (!Number.isFinite(drawTs)) return minTs === null && maxTs === null;
    if (minTs !== null && drawTs < minTs) return false;
    if (maxTs !== null && drawTs > maxTs) return false;
    return true;
  });
};

export const calculateSessionSummary = <T extends PredictionLike>(
  predictions: T[],
  sessionCostRM: number,
  payoutByMatch: Partial<Record<number, number>>,
  jackpotMatches = 6
): SessionSummary => {
  const totalSessions = predictions.length;
  const totalCost = totalSessions * sessionCostRM;
  let totalWinnings = 0;
  let jackpotWins = 0;

  for (const pred of predictions) {
    if (pred.matches === jackpotMatches) {
      jackpotWins += 1;
    } else {
      totalWinnings += payoutByMatch[pred.matches] || 0;
    }
  }

  return {
    totalSessions,
    totalCost,
    totalWinnings,
    netProfit: totalWinnings - totalCost,
    jackpotWins,
  };
};
