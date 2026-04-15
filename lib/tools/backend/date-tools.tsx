import { z } from "zod";

// Shared date tool schema
export const getTodayDateSchema = z.object({
  format: z.enum(["iso", "readable", "date-only", "time-only"]).default("readable").describe("Date format to return"),
  timezone: z.string().optional().describe("Timezone (e.g., 'UTC', 'America/New_York')"),
});

export type GetTodayDateParams = z.infer<typeof getTodayDateSchema>;

// Shared execute function
export async function executeGetTodayDate({ format, timezone }: GetTodayDateParams) {
  const now = new Date();
  
  let date = now;
  if (timezone) {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(now);
      const dateObj = new Date(
        `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`
      );
      date = dateObj;
    } catch (error) {
      console.warn('Invalid timezone, using local time:', timezone);
    }
  }

  let result: any = {
    timestamp: date.getTime(),
    timezone: timezone || 'local',
  };

  switch (format) {
    case 'iso':
      result.formatted = date.toISOString();
      break;
    case 'readable':
      result.formatted = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      break;
    case 'date-only':
      result.formatted = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      break;
    case 'time-only':
      result.formatted = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      break;
  }

  return result;
}
