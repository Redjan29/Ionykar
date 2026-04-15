export function getRentalDaysInclusive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (!Number.isFinite(days) || days < 1) return null;
  return { start, end, days };
}

function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  return day === 0 || day === 6;
}

export function computeBasePriceForPeriod({ startDate, endDate, priceWeekday, priceWeekend, fallbackPricePerDay }) {
  const range = getRentalDaysInclusive(startDate, endDate);
  if (!range) return null;

  const weekdayRate = Number(priceWeekday ?? fallbackPricePerDay ?? 0);
  const weekendRate = Number(priceWeekend ?? fallbackPricePerDay ?? 0);
  if (!Number.isFinite(weekdayRate) || weekdayRate <= 0) return null;
  if (!Number.isFinite(weekendRate) || weekendRate <= 0) return null;

  let weekdayDays = 0;
  let weekendDays = 0;
  let total = 0;

  const cursor = new Date(range.start);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    if (isWeekend(cursor)) {
      weekendDays += 1;
      total += weekendRate;
    } else {
      weekdayDays += 1;
      total += weekdayRate;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const avgPerDay = total / Math.max(1, range.days);
  return { days: range.days, weekdayDays, weekendDays, total, avgPerDay, weekdayRate, weekendRate };
}

