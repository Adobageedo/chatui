"use client";

import { z } from "zod";
import type { Toolkit } from "@assistant-ui/react";

export const dateTools: Toolkit = {
  getTodayDate: {
    description: "Get the current date and time",
    parameters: z.object({
      format: z.enum(["iso", "readable", "date-only", "time-only"]).default("readable").describe("Date format to return"),
      timezone: z.string().optional().describe("Timezone (e.g., 'UTC', 'America/New_York')"),
    }),
    execute: async ({ format, timezone }) => {
      const now = new Date();
      
      // Apply timezone if specified
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
      format="readable";

      switch (format) {
        case 'readable':
          result.formatted = date.toLocaleString('fr', {
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
      }

      return result;
    },
    render: ({ args, result }) => {
      if (!result) return <div>Getting current date...</div>;
      
      return (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <h3 className="font-semibold">Current Date & Time</h3>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-mono">{result.formatted}</div>
            <div className="text-sm text-muted-foreground">
              <div>Format: {args.format}</div>
              <div>Timezone: {result.timezone}</div>
              <div>Timestamp: {result.timestamp}</div>
            </div>
          </div>
        </div>
      );
    },
  },
};
