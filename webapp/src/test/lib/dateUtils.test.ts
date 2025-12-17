import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatChartTime,
} from '@/lib/dateUtils';

describe('dateUtils (UTC)', () => {
  // Store the original implementation to restore it later
  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;

  beforeEach(() => {
    // 1. Force "System Time" if your utils use 'new Date()' (current time)
    vi.useFakeTimers();
    
    // 2. Mock Timezone Offset to 0 (UTC)
    // This tricks the Date object into thinking the local machine is in UTC.
    // Note: getTimezoneOffset returns minutes. 0 = UTC. -60 = UTC+1.
    Date.prototype.getTimezoneOffset = () => 0;
  });

  afterEach(() => {
    // Restore original browser/node behavior
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    vi.useRealTimers();
  });

  describe('formatDateTime', () => {
    it('formats ISO string to precise DD/MM/YYYY HH:MM:SS in UTC', () => {
      // 14:30 UTC input -> 14:30 Output (because we forced UTC)
      const iso_string = '2025-01-15T14:30:45Z';
      const result = formatDateTime(iso_string);
      
      expect(result).toBe('15/01/2025 14:30:45');
    });

    it('formats Date object correctly', () => {
      const date = new Date('2025-01-15T14:30:45Z');
      const result = formatDateTime(date);
      
      expect(result).toBe('15/01/2025 14:30:45');
    });

    it('pads single digits with zero', () => {
      // January 1st, 2025 at 01:05:09 UTC
      const date = new Date('2025-01-01T01:05:09Z');
      const result = formatDateTime(date);

      expect(result).toBe('01/01/2025 01:05:09');
    });

    it('handles leap year date', () => {
      const date = new Date('2024-02-29T12:00:00Z');
      const result = formatDateTime(date);

      expect(result).toBe('29/02/2024 12:00:00');
    });
  });

  describe('formatDate', () => {
    it('formats to exact DD/MM/YYYY', () => {
      const date = new Date('2025-01-15T14:30:45Z');
      const result = formatDate(date);

      expect(result).toBe('15/01/2025');
    });

    it('handles end of year correctly', () => {
      const date = new Date('2025-12-31T23:59:59Z');
      const result = formatDate(date);

      expect(result).toBe('31/12/2025');
    });
  });

  describe('formatTime', () => {
    it('formats to exact HH:MM:SS', () => {
      const date = new Date('2025-01-15T14:30:45Z');
      const result = formatTime(date);

      expect(result).toBe('14:30:45');
    });

    it('pads single digit times', () => {
      const date = new Date('2025-01-15T09:05:01Z');
      const result = formatTime(date);

      expect(result).toBe('09:05:01');
    });

    it('handles midnight', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatTime(date);

      expect(result).toBe('00:00:00');
    });
  });

  describe('formatChartTime', () => {
    it('formats to HH:MM and drops seconds', () => {
      const date = new Date('2025-01-15T14:30:45Z');
      const result = formatChartTime(date);

      expect(result).toBe('14:30');
    });

    it('does not round up minutes', () => {
      // Even at 59 seconds, it should typically just show the minute (floor)
      // unless your util specifically rounds. Assuming floor here:
      const date = new Date('2025-01-15T14:30:59Z');
      const result = formatChartTime(date);

      expect(result).toBe('14:30');
    });
  });
  
  describe('Edge Cases', () => {
    it('handles Invalid Date inputs gracefully', () => {
       // Assuming your util returns "Invalid Date" or "NaN/NaN/..."
       // Adapt expected string to your actual implementation
       const result = formatDateTime('potato');
       expect(result).toMatch(/Invalid|NaN/);
    });

    it('handles Unix Epoch (0)', () => {
      const epoch = new Date(0); // 1970-01-01T00:00:00Z
      expect(formatDateTime(epoch)).toBe('01/01/1970 00:00:00');
    });
  });
});