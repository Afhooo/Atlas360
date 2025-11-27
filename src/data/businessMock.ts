const BRANCHES = ['Santa Cruz', 'La Paz', 'Cochabamba'];
const CHANNELS = ['Asesores', 'Promotores', 'E-commerce'];

const rangeEnd = new Date();
rangeEnd.setUTCHours(0, 0, 0, 0);
const rangeStart = new Date(rangeEnd);
rangeStart.setUTCDate(rangeStart.getUTCDate() - 90);

const dailySales: {
  date: string;
  branch: string;
  channel: string;
  total: number;
  units: number;
}[] = [];

const dailyInventory: {
  date: string;
  branch: string;
  critical: boolean;
  stock: number;
}[] = [];

const weeklyProductivity: {
  week: string;
  output: number;
  hours: number;
  tickets: number;
}[] = [];

const dailyReturns: {
  date: string;
  branch: string;
  amount: number;
  reason: string;
}[] = [];
const daysDiff = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));

for (let i = 0; i <= daysDiff; i += 1) {
  const date = new Date(rangeStart);
  date.setUTCDate(date.getUTCDate() + i);
  const iso = date.toISOString().slice(0, 10);
  const totalBase = 20000 + (Math.sin(i / 5) * 4000);
  const branch = BRANCHES[i % BRANCHES.length];
  const channel = CHANNELS[i % CHANNELS.length];
  const total = Math.round(totalBase + (Math.random() * 3000 - 1500));
  const units = Math.round((total / 450) + Math.random() * 20);
  dailySales.push({ date: iso, branch, channel, total, units });

  const stockLevel = 120 - (Math.sin(i / 7) * 20) + (Math.random() * 10);
  dailyInventory.push({ date: iso, branch, critical: stockLevel < 30, stock: Math.max(5, Math.round(stockLevel)) });

  if (i % 3 === 0) {
    dailyReturns.push({
      date: iso,
      branch,
      amount: Math.round(500 + Math.random() * 600),
      reason: ['Cliente no satisfecho', 'Devolución por cambio', 'Problema logístico'][i % 3],
    });
  }
}

for (let weekStart = new Date(rangeStart); weekStart <= rangeEnd; weekStart.setUTCDate(weekStart.getUTCDate() + 7)) {
  const weekLabel = `${weekStart.getUTCFullYear()}-W${(`${weekStart.getUTCMonth() + 1}`).padStart(2, '0')}`;
  weeklyProductivity.push({
    week: weekLabel,
    output: Math.round(1800 + Math.random() * 400),
    hours: 40,
    tickets: Math.round(weekStart.getTime() % 200 + 40),
  });
}

export type MonthlyTarget = { revenue: number; margin: number };

const monthlyTargets: Record<string, MonthlyTarget> = {};
for (let i = 0; i < 4; i += 1) {
  const monthDate = new Date(rangeEnd);
  monthDate.setUTCDate(1);
  monthDate.setUTCMonth(monthDate.getUTCMonth() - i);
  const monthKey = `${monthDate.getUTCFullYear()}-${(`${monthDate.getUTCMonth() + 1}`).padStart(2, '0')}`;
  const revenueBase = 460000 + (i * 15000);
  const marginBase = 0.3 + (Math.sin(i) * 0.02);
  monthlyTargets[monthKey] = {
    revenue: Math.round(revenueBase + Math.sin(i + 1) * 18000),
    margin: Number(Math.max(0.26, Math.min(0.38, marginBase)).toFixed(2)),
  };
}

export const businessMock = {
  dailySales,
  dailyInventory,
  weeklyProductivity,
  dailyReturns,
  monthlyTargets,
};

export function sampleWeeklyComparison(weeks: number) {
  return weeklyProductivity.slice(-weeks);
}

export function totalByRange(start: string, end: string) {
  const filtered = dailySales.filter((entry) => entry.date >= start && entry.date <= end);
  const revenue = filtered.reduce((sum, entry) => sum + entry.total, 0);
  const units = filtered.reduce((sum, entry) => sum + entry.units, 0);
  return { revenue, units, days: filtered.length };
}

export function returnsByWeek() {
  return dailyReturns.reduce<Record<string, number>>((acc, entry) => {
    const week = entry.date.slice(0, 7);
    acc[week] = (acc[week] || 0) + entry.amount;
    return acc;
  }, {});
}
