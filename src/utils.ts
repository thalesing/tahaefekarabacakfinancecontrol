// Currency formatting helpers
export function formatTRY(value: number, decimalDigits: number = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(value);
}

export function formatUSD(value: number, decimalDigits: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(value);
}

export function formatNumber(value: number, decimalDigits: number = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(value);
}

export function formatPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

// Generate beautiful smooth random-walk historical data for charts
export function generateHistoricalData(baseValue: number, days: number = 10, volatility: number = 0.015) {
  const data = [];
  const now = new Date();
  
  // Create historical path
  let currentVal = baseValue;
  
  // Let's create an elegant path
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
    
    data.push({
      date: dateStr,
      Değer: Number(currentVal.toFixed(2)),
    });

    // Random walk
    const changePercent = (Math.random() - 0.49) * 2 * volatility;
    currentVal = currentVal * (1 + changePercent);
  }

  return data;
}
