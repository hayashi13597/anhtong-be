// Get the Wednesday of the current week (in UTC to ensure consistency across timezones)
export function getCurrentWeekWednesday(): Date {
  const now = new Date();
  // Use UTC to avoid timezone issues between local dev and Cloudflare Workers
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -4 : 3); // Adjust when day is Sunday
  const wednesday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0),
  );
  return wednesday;
}

// Check if it's wednesday
export function isWednesday(): boolean {
  return new Date().getDay() === 3;
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
