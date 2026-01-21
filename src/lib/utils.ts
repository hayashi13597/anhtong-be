// Get the Monday of the current week (in UTC to ensure consistency across timezones)
export function getCurrentWeekMonday(): Date {
  const now = new Date();
  // Use UTC to avoid timezone issues between local dev and Cloudflare Workers
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0),
  );
  return monday;
}

// Check if it's Monday
export function isMonday(): boolean {
  return new Date().getDay() === 1;
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
