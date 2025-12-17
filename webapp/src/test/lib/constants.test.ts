/**
 * Unit tests for constants.ts
 *
 * Tests cover:
 * - POWER_QUALITY_LIMITS object structure
 * - Correct limit values according to PN-EN 50160 standards
 * - Immutability (as const)
 * - Type safety
 */

import { describe, it, expect } from 'vitest';
import { POWER_QUALITY_LIMITS } from '@/lib/constants';

describe('constants', () => {
  describe('POWER_QUALITY_LIMITS', () => {
    it('defines voltage critical limits correctly', () => {
      expect(POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN).toBe(207);
      expect(POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX).toBeCloseTo(253, 5);
    });

    it('defines voltage warning limits correctly', () => {
      expect(POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN).toBe(220);
      expect(POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX).toBe(240);
    });

    it('defines frequency critical limits correctly', () => {
      expect(POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MIN).toBe(49.5);
      expect(POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MAX).toBe(50.5);
    });

    it('defines frequency warning limits correctly', () => {
      expect(POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN).toBe(49.8);
      expect(POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX).toBe(50.2);
    });

    it('defines current limits correctly', () => {
      expect(POWER_QUALITY_LIMITS.CURRENT_WARNING).toBe(13);
      expect(POWER_QUALITY_LIMITS.CURRENT_CRITICAL).toBe(16);
    });

    it('has all expected properties', () => {
      const expected_keys = [
        'VOLTAGE_CRITICAL_MIN',
        'VOLTAGE_CRITICAL_MAX',
        'VOLTAGE_WARNING_MIN',
        'VOLTAGE_WARNING_MAX',
        'FREQUENCY_CRITICAL_MIN',
        'FREQUENCY_CRITICAL_MAX',
        'FREQUENCY_WARNING_MIN',
        'FREQUENCY_WARNING_MAX',
        'CURRENT_WARNING',
        'CURRENT_CRITICAL',
      ];

      expected_keys.forEach((key) => {
        expect(POWER_QUALITY_LIMITS).toHaveProperty(key);
      });
    });

    it('contains exactly 10 properties', () => {
      const keys = Object.keys(POWER_QUALITY_LIMITS);
      expect(keys).toHaveLength(10);
    });

    it('all values are numbers', () => {
      Object.values(POWER_QUALITY_LIMITS).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    describe('Voltage Limits Relationships', () => {
      it('critical min is less than warning min', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN
        );
      });

      it('warning min is less than warning max', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX
        );
      });

      it('warning max is less than critical max', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX).toBeLessThan(
          POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX
        );
      });

      it('nominal voltage (230V) is within warning range', () => {
        const nominal_voltage = 230;
        expect(nominal_voltage).toBeGreaterThanOrEqual(
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN
        );
        expect(nominal_voltage).toBeLessThanOrEqual(
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX
        );
      });
    });

    describe('Frequency Limits Relationships', () => {
      it('critical min is less than warning min', () => {
        expect(POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN
        );
      });

      it('warning min is less than warning max', () => {
        expect(POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX
        );
      });

      it('warning max is less than critical max', () => {
        expect(POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX).toBeLessThan(
          POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MAX
        );
      });

      it('nominal frequency (50Hz) is within warning range', () => {
        const nominal_frequency = 50.0;
        expect(nominal_frequency).toBeGreaterThanOrEqual(
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN
        );
        expect(nominal_frequency).toBeLessThanOrEqual(
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX
        );
      });
    });

    describe('Current Limits Relationships', () => {
      it('warning limit is less than critical limit', () => {
        expect(POWER_QUALITY_LIMITS.CURRENT_WARNING).toBeLessThan(
          POWER_QUALITY_LIMITS.CURRENT_CRITICAL
        );
      });

      it('current limits are positive', () => {
        expect(POWER_QUALITY_LIMITS.CURRENT_WARNING).toBeGreaterThan(0);
        expect(POWER_QUALITY_LIMITS.CURRENT_CRITICAL).toBeGreaterThan(0);
      });
    });

    describe('PN-EN 50160 Standard Compliance', () => {
      it('voltage range covers ±10% of 230V nominal (207V to 253V)', () => {
        const nominal = 230;
        const tolerance = 0.1;

        const expected_min = nominal * (1 - tolerance);
        const expected_max = nominal * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN).toBe(expected_min);
        // Use toBeCloseTo to handle floating point precision (230 * 1.1 = 253.00000000000003)
        expect(POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX).toBeCloseTo(expected_max, 5);
      });

      it('frequency range covers ±1% of 50Hz nominal (49.5Hz to 50.5Hz)', () => {
        const nominal = 50;
        const tolerance = 0.01;

        const expected_min = nominal * (1 - tolerance);
        const expected_max = nominal * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MIN).toBe(expected_min);
        expect(POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MAX).toBe(expected_max);
      });

      it('warning ranges are stricter than critical ranges', () => {
        // Voltage warning range should be narrower
        const voltage_warning_range =
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX -
          POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN;
        const voltage_critical_range =
          POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX -
          POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN;

        expect(voltage_warning_range).toBeLessThan(voltage_critical_range);

        // Frequency warning range should be narrower
        const frequency_warning_range =
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX -
          POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN;
        const frequency_critical_range =
          POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MAX -
          POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MIN;

        expect(frequency_warning_range).toBeLessThan(frequency_critical_range);
      });
    });

    describe('Immutability', () => {
      it('is marked as const (readonly)', () => {
        // TypeScript const assertion makes properties readonly
        // This test verifies runtime behavior
        expect(() => {
          // @ts-expect-error - Testing immutability
          POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN = 200;
        }).toThrow();
      });

      it('cannot add new properties', () => {
        expect(() => {
          // @ts-expect-error - Testing immutability
          POWER_QUALITY_LIMITS.NEW_PROPERTY = 100;
        }).toThrow();
      });

      it('cannot delete properties', () => {
        expect(() => {
          // @ts-expect-error - Testing immutability
          delete POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN;
        }).toThrow();
      });
    });

    describe('Type Safety', () => {
      it('provides correct TypeScript types', () => {
        // This is compile-time check, but we can verify runtime types
        const voltage_min: number = POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN;
        const frequency_max: number = POWER_QUALITY_LIMITS.FREQUENCY_CRITICAL_MAX;

        expect(typeof voltage_min).toBe('number');
        expect(typeof frequency_max).toBe('number');
      });
    });

    describe('Practical Usage Scenarios', () => {
      it('correctly identifies voltage within normal range', () => {
        const test_voltage = 230;

        const is_within_warning =
          test_voltage >= POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN &&
          test_voltage <= POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX;

        expect(is_within_warning).toBe(true);
      });

      it('correctly identifies voltage in warning range', () => {
        const test_voltage = 218; // Between critical (207) and warning (220)

        const is_critical =
          test_voltage < POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN ||
          test_voltage > POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX;

        const is_in_warning_range =
          test_voltage < POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MIN ||
          test_voltage > POWER_QUALITY_LIMITS.VOLTAGE_WARNING_MAX;

        expect(is_critical).toBe(false);
        expect(is_in_warning_range).toBe(true);
      });

      it('correctly identifies critical voltage', () => {
        const test_voltage = 205; // Below critical min (207)

        const is_critical =
          test_voltage < POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MIN ||
          test_voltage > POWER_QUALITY_LIMITS.VOLTAGE_CRITICAL_MAX;

        expect(is_critical).toBe(true);
      });

      it('correctly identifies frequency within normal range', () => {
        const test_frequency = 50.0;

        const is_within_warning =
          test_frequency >= POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MIN &&
          test_frequency <= POWER_QUALITY_LIMITS.FREQUENCY_WARNING_MAX;

        expect(is_within_warning).toBe(true);
      });

      it('correctly identifies current in warning range', () => {
        const test_current = 14; // Between warning (13) and critical (16)

        const is_warning =
          test_current >= POWER_QUALITY_LIMITS.CURRENT_WARNING &&
          test_current < POWER_QUALITY_LIMITS.CURRENT_CRITICAL;

        expect(is_warning).toBe(true);
      });

      it('correctly identifies critical current', () => {
        const test_current = 17; // Above critical (16)

        const is_critical = test_current >= POWER_QUALITY_LIMITS.CURRENT_CRITICAL;

        expect(is_critical).toBe(true);
      });
    });
  });
});
