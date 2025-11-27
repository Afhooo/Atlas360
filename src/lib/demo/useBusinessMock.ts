import { businessMock, returnsByWeek, sampleWeeklyComparison, totalByRange } from '@/data/businessMock';

function computeWeeklySales() {
  const map: Record<string, { week: string; revenue: number; units: number }> = {};
  businessMock.dailySales.forEach((entry) => {
    const key = entry.date.slice(0, 7);
    if (!map[key]) {
      map[key] = { week: key, revenue: 0, units: 0 };
    }
    map[key].revenue += entry.total;
    map[key].units += entry.units;
  });
  return Object.values(map).slice(-16);
}

export function useBusinessMock() {
  const weeklySales = computeWeeklySales();
  return {
    dailySales: businessMock.dailySales,
    dailyInventory: businessMock.dailyInventory,
    weeklyProductivity: businessMock.weeklyProductivity,
    weeklySales,
    dailyReturns: businessMock.dailyReturns,
    monthlyTargets: businessMock.monthlyTargets,
    returnsByWeek: returnsByWeek(),
    sampleWeeklyComparison,
    totalByRange,
  };
}
