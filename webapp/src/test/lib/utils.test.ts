/**
 * Unit tests for utils.ts
 *
 * Tests cover:
 * - cn() function (clsx + tailwind-merge utility)
 * - Class name merging and deduplication
 * - Conditional class application
 * - Tailwind class conflict resolution
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('merges multiple class names', () => {
      const result = cn('class1', 'class2', 'class3');

      expect(result).toBe('class1 class2 class3');
    });

    it('handles conditional classes with objects', () => {
      const result = cn('base', {
        active: true,
        disabled: false,
      });

      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('disabled');
    });

    it('handles conditional classes with arrays', () => {
      const should_hide = false;
      const result = cn(['base', 'primary'], ['secondary', should_hide && 'hidden']);

      expect(result).toContain('base');
      expect(result).toContain('primary');
      expect(result).toContain('secondary');
      expect(result).not.toContain('hidden');
    });

    it('handles undefined and null values', () => {
      const result = cn('base', undefined, null, 'end');

      expect(result).toBe('base end');
    });

    it('handles empty strings', () => {
      const result = cn('base', '', 'end');

      expect(result).toBe('base end');
    });

    it('resolves Tailwind class conflicts (tailwind-merge)', () => {
      // tailwind-merge should keep the last conflicting class
      const result = cn('p-4', 'p-8');

      expect(result).toBe('p-8');
      expect(result).not.toContain('p-4');
    });

    it('resolves background color conflicts', () => {
      const result = cn('bg-red-500', 'bg-blue-500');

      expect(result).toBe('bg-blue-500');
      expect(result).not.toContain('bg-red-500');
    });

    it('resolves text size conflicts', () => {
      const result = cn('text-sm', 'text-lg');

      expect(result).toBe('text-lg');
      expect(result).not.toContain('text-sm');
    });

    it('keeps non-conflicting classes', () => {
      const result = cn('p-4', 'text-lg', 'bg-blue-500');

      expect(result).toContain('p-4');
      expect(result).toContain('text-lg');
      expect(result).toContain('bg-blue-500');
    });

    it('handles complex conditional expressions', () => {
      const is_active = true;
      const is_disabled = false;
      const size = 'large';

      const result = cn(
        'base',
        is_active && 'active',
        is_disabled && 'disabled',
        size === 'large' && 'text-lg',
      );

      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).toContain('text-lg');
      expect(result).not.toContain('disabled');
    });

    it('handles nested arrays and objects', () => {
      const result = cn(
        'base',
        ['array-class1', 'array-class2'],
        {
          'object-class1': true,
          'object-class2': false,
        }
      );

      expect(result).toContain('base');
      expect(result).toContain('array-class1');
      expect(result).toContain('array-class2');
      expect(result).toContain('object-class1');
      expect(result).not.toContain('object-class2');
    });

    it('returns empty string for no arguments', () => {
      const result = cn();

      expect(result).toBe('');
    });

    it('returns empty string for all falsy arguments', () => {
      const result = cn(false, null, undefined, '');

      expect(result).toBe('');
    });

    it('handles whitespace in class names', () => {
      const result = cn('  base  ', ' extra ');

      expect(result).toBe('base extra');
    });

    it('deduplicates identical class names', () => {
      const result = cn('base', 'base', 'base');

      expect(result).toBe('base');
    });

    it('works with component variant patterns', () => {
      const variant: 'primary' | 'secondary' = 'primary';
      const size: 'sm' | 'lg' = 'lg';

      const result = cn(
        'button-base',
        {
          'button-primary': variant === 'primary',
        },
        {
          'button-lg': size === 'lg',
        }
      );

      expect(result).toContain('button-base');
      expect(result).toContain('button-primary');
      expect(result).toContain('button-lg');
      expect(result).not.toContain('button-secondary');
      expect(result).not.toContain('button-sm');
    });

    it('handles responsive Tailwind classes without conflicts', () => {
      const result = cn('p-4', 'md:p-6', 'lg:p-8');

      expect(result).toContain('p-4');
      expect(result).toContain('md:p-6');
      expect(result).toContain('lg:p-8');
    });

    it('resolves conflicts in responsive variants', () => {
      const result = cn('md:p-4', 'md:p-8');

      expect(result).toBe('md:p-8');
      expect(result).not.toContain('md:p-4');
    });

    it('handles hover and focus state classes', () => {
      const result = cn('hover:bg-blue-500', 'focus:ring-2', 'active:scale-95');

      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('focus:ring-2');
      expect(result).toContain('active:scale-95');
    });

    it('handles dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-gray-900', 'text-black', 'dark:text-white');

      expect(result).toContain('bg-white');
      expect(result).toContain('dark:bg-gray-900');
      expect(result).toContain('text-black');
      expect(result).toContain('dark:text-white');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long class strings', () => {
      const long_classes = Array.from({ length: 50 }, (_, i) => `class-${i}`);
      const result = cn(...long_classes);

      long_classes.forEach((cls) => {
        expect(result).toContain(cls);
      });
    });

    it('handles special characters in custom class names', () => {
      const result = cn('class-with-dash', 'class_with_underscore', 'class123');

      expect(result).toContain('class-with-dash');
      expect(result).toContain('class_with_underscore');
      expect(result).toContain('class123');
    });

    it('handles mixed input types simultaneously', () => {
      const should_hide = false;
      const result = cn(
        'base',
        ['array1', 'array2'],
        { conditional1: true, conditional2: false },
        undefined,
        null,
        should_hide && 'hidden',
        'end'
      );

      expect(result).toContain('base');
      expect(result).toContain('array1');
      expect(result).toContain('array2');
      expect(result).toContain('conditional1');
      expect(result).toContain('end');
      expect(result).not.toContain('conditional2');
      expect(result).not.toContain('hidden');
    });
  });
});
