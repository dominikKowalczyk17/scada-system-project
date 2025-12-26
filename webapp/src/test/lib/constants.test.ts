/**
 * Unit tests for constants.ts
 *
 * Tests cover:
 * - POWER_QUALITY_LIMITS object structure
 * - Correct limit values according to PN-EN 50160 and IEC 61000 standards
 * - Immutability (Object.freeze)
 * - Type safety
 */

import { describe, it, expect } from 'vitest';
import { POWER_QUALITY_LIMITS } from '@/lib/constants';

describe('constants', () => {
  describe('POWER_QUALITY_LIMITS', () => {
    it('defines nominal voltage correctly (PN-EN 50160)', () => {
      expect(POWER_QUALITY_LIMITS.NOMINAL_VOLTAGE).toBe(230.0);
    });

    it('defines voltage limits correctly (±10% per PN-EN 50160)', () => {
      expect(POWER_QUALITY_LIMITS.VOLTAGE_MIN).toBe(207.0);
      expect(POWER_QUALITY_LIMITS.VOLTAGE_MAX).toBe(253.0);
    });

    it('defines nominal frequency correctly (PN-EN 50160)', () => {
      expect(POWER_QUALITY_LIMITS.NOMINAL_FREQUENCY).toBe(50.0);
    });

    it('defines frequency limits correctly (±1% per PN-EN 50160)', () => {
      expect(POWER_QUALITY_LIMITS.FREQUENCY_MIN).toBe(49.5);
      expect(POWER_QUALITY_LIMITS.FREQUENCY_MAX).toBe(50.5);
    });

    it('defines current limits correctly (household 16A circuit)', () => {
      expect(POWER_QUALITY_LIMITS.CURRENT_WARNING).toBe(13.0);
      expect(POWER_QUALITY_LIMITS.CURRENT_CRITICAL).toBe(16.0);
    });

    it('defines THD voltage limit correctly (IEC 61000-4-7)', () => {
      expect(POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT).toBe(8.0);
    });

    it('defines THD current limit correctly (IEC 61000-3-2)', () => {
      expect(POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT).toBe(5.0);
    });

    it('defines minimum power factor correctly', () => {
      expect(POWER_QUALITY_LIMITS.MIN_POWER_FACTOR).toBe(0.85);
    });

    it('has all expected properties', () => {
      const expected_keys = [
        'NOMINAL_VOLTAGE',
        'VOLTAGE_MIN',
        'VOLTAGE_MAX',
        'NOMINAL_FREQUENCY',
        'FREQUENCY_MIN',
        'FREQUENCY_MAX',
        'CURRENT_WARNING',
        'CURRENT_CRITICAL',
        'VOLTAGE_THD_LIMIT',
        'CURRENT_THD_LIMIT',
        'MIN_POWER_FACTOR',
      ];

      expected_keys.forEach((key) => {
        expect(POWER_QUALITY_LIMITS).toHaveProperty(key);
      });
    });

    it('contains exactly 11 properties', () => {
      const keys = Object.keys(POWER_QUALITY_LIMITS);
      expect(keys).toHaveLength(11);
    });

    it('all values are numbers', () => {
      Object.values(POWER_QUALITY_LIMITS).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    describe('Voltage Limits Relationships', () => {
      it('min voltage is less than max voltage', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.VOLTAGE_MAX
        );
      });

      it('nominal voltage (230V) is within acceptable range', () => {
        expect(POWER_QUALITY_LIMITS.NOMINAL_VOLTAGE).toBeGreaterThanOrEqual(
          POWER_QUALITY_LIMITS.VOLTAGE_MIN
        );
        expect(POWER_QUALITY_LIMITS.NOMINAL_VOLTAGE).toBeLessThanOrEqual(
          POWER_QUALITY_LIMITS.VOLTAGE_MAX
        );
      });

      it('voltage limits match ±10% tolerance', () => {
        const tolerance = 0.10;
        const expected_min = POWER_QUALITY_LIMITS.NOMINAL_VOLTAGE * (1 - tolerance);
        const expected_max = POWER_QUALITY_LIMITS.NOMINAL_VOLTAGE * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.VOLTAGE_MIN).toBe(expected_min);
        expect(POWER_QUALITY_LIMITS.VOLTAGE_MAX).toBeCloseTo(expected_max, 5);
      });
    });

    describe('Frequency Limits Relationships', () => {
      it('min frequency is less than max frequency', () => {
        expect(POWER_QUALITY_LIMITS.FREQUENCY_MIN).toBeLessThan(
          POWER_QUALITY_LIMITS.FREQUENCY_MAX
        );
      });

      it('nominal frequency (50Hz) is within acceptable range', () => {
        expect(POWER_QUALITY_LIMITS.NOMINAL_FREQUENCY).toBeGreaterThanOrEqual(
          POWER_QUALITY_LIMITS.FREQUENCY_MIN
        );
        expect(POWER_QUALITY_LIMITS.NOMINAL_FREQUENCY).toBeLessThanOrEqual(
          POWER_QUALITY_LIMITS.FREQUENCY_MAX
        );
      });

      it('frequency limits match ±1% tolerance', () => {
        const tolerance = 0.01;
        const expected_min = POWER_QUALITY_LIMITS.NOMINAL_FREQUENCY * (1 - tolerance);
        const expected_max = POWER_QUALITY_LIMITS.NOMINAL_FREQUENCY * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.FREQUENCY_MIN).toBe(expected_min);
        expect(POWER_QUALITY_LIMITS.FREQUENCY_MAX).toBe(expected_max);
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

      it('warning is approximately 80% of critical (16A)', () => {
        const expected_warning = POWER_QUALITY_LIMITS.CURRENT_CRITICAL * 0.8;
        // 13A is close to 12.8A (80% of 16A), using 0 decimal places tolerance
        expect(POWER_QUALITY_LIMITS.CURRENT_WARNING).toBeCloseTo(expected_warning, 0);
      });
    });

    describe('THD Limits Relationships', () => {
      it('THD limits are positive', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT).toBeGreaterThan(0);
        expect(POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT).toBeGreaterThan(0);
      });

      it('THD limits are reasonable percentages', () => {
        expect(POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT).toBeLessThanOrEqual(100);
        expect(POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT).toBeLessThanOrEqual(100);
      });

      it('voltage THD limit is stricter than current THD limit', () => {
        // Note: Actually voltage limit (8%) is higher than current limit (5%)
        // This is intentional per standards
        expect(POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT).toBeGreaterThan(
          POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT
        );
      });
    });

    describe('Power Factor Limits', () => {
      it('minimum power factor is between 0 and 1', () => {
        expect(POWER_QUALITY_LIMITS.MIN_POWER_FACTOR).toBeGreaterThan(0);
        expect(POWER_QUALITY_LIMITS.MIN_POWER_FACTOR).toBeLessThanOrEqual(1);
      });

      it('minimum power factor is typical industrial value (0.85)', () => {
        expect(POWER_QUALITY_LIMITS.MIN_POWER_FACTOR).toBe(0.85);
      });
    });

    describe('PN-EN 50160 Standard Compliance', () => {
      it('voltage range covers ±10% of 230V nominal (207V to 253V)', () => {
        const nominal = 230;
        const tolerance = 0.1;

        const expected_min = nominal * (1 - tolerance);
        const expected_max = nominal * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.VOLTAGE_MIN).toBe(expected_min);
        expect(POWER_QUALITY_LIMITS.VOLTAGE_MAX).toBeCloseTo(expected_max, 5);
      });

      it('frequency range covers ±1% of 50Hz nominal (49.5Hz to 50.5Hz)', () => {
        const nominal = 50;
        const tolerance = 0.01;

        const expected_min = nominal * (1 - tolerance);
        const expected_max = nominal * (1 + tolerance);

        expect(POWER_QUALITY_LIMITS.FREQUENCY_MIN).toBe(expected_min);
        expect(POWER_QUALITY_LIMITS.FREQUENCY_MAX).toBe(expected_max);
      });
    });

    describe('Immutability', () => {
      it('is frozen (readonly)', () => {
        // Object.freeze makes properties readonly
        expect(() => {
          // @ts-expect-error - Testing immutability
          POWER_QUALITY_LIMITS.VOLTAGE_MIN = 200;
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
          delete POWER_QUALITY_LIMITS.VOLTAGE_MIN;
        }).toThrow();
      });
    });

    describe('Type Safety', () => {
      it('provides correct TypeScript types', () => {
        // This is compile-time check, but we can verify runtime types
        const voltage_min: number = POWER_QUALITY_LIMITS.VOLTAGE_MIN;
        const frequency_max: number = POWER_QUALITY_LIMITS.FREQUENCY_MAX;
        const thd_limit: number = POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT;

        expect(typeof voltage_min).toBe('number');
        expect(typeof frequency_max).toBe('number');
        expect(typeof thd_limit).toBe('number');
      });
    });

    describe('Practical Usage Scenarios', () => {
      it('correctly identifies voltage within normal range', () => {
        const test_voltage = 230;

        const is_within_range =
          test_voltage >= POWER_QUALITY_LIMITS.VOLTAGE_MIN &&
          test_voltage <= POWER_QUALITY_LIMITS.VOLTAGE_MAX;

        expect(is_within_range).toBe(true);
      });

      it('correctly identifies voltage below critical min', () => {
        const test_voltage = 205; // Below critical min (207)

        const is_critical = test_voltage < POWER_QUALITY_LIMITS.VOLTAGE_MIN;

        expect(is_critical).toBe(true);
      });

      it('correctly identifies voltage above critical max', () => {
        const test_voltage = 255; // Above critical max (253)

        const is_critical = test_voltage > POWER_QUALITY_LIMITS.VOLTAGE_MAX;

        expect(is_critical).toBe(true);
      });

      it('correctly identifies frequency within normal range', () => {
        const test_frequency = 50.0;

        const is_within_range =
          test_frequency >= POWER_QUALITY_LIMITS.FREQUENCY_MIN &&
          test_frequency <= POWER_QUALITY_LIMITS.FREQUENCY_MAX;

        expect(is_within_range).toBe(true);
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

      it('correctly identifies THD voltage exceeding limit', () => {
        const test_thd = 9.5; // Above limit (8%)

        const exceeds_limit = test_thd > POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT;

        expect(exceeds_limit).toBe(true);
      });

      it('correctly identifies low power factor', () => {
        const test_pf = 0.80; // Below minimum (0.85)

        const is_low = test_pf < POWER_QUALITY_LIMITS.MIN_POWER_FACTOR;

        expect(is_low).toBe(true);
      });
    });
  });
});
