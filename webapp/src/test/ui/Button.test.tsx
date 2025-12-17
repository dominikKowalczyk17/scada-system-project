/**
 * Unit tests for Button component
 * Demonstrates basic Vitest + React Testing Library usage
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/ui/Button';
import { faCoffee, faHeart } from '@fortawesome/free-solid-svg-icons';

describe('Button Component', () => {
  it('renders button element', () => {
    render(<Button size="md" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders button with correct size class', () => {
    render(<Button size="md" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-md');
  });

  it('renders button with small size class', () => {
    render(<Button size="sm" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-sm');
  });

  it('renders button with large size class', () => {
    render(<Button size="lg" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-lg');
  });

  it('renders button with extra small size class', () => {
    render(<Button size="xs" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-xs');
  });

  it('renders with Icon component inside', () => {
    const { container } = render(<Button size="md" icon={faCoffee} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  describe('Size variants', () => {
    it('applies correct class for each size variant', () => {
      const sizes = ['xs', 'sm', 'md', 'lg'] as const;

      sizes.forEach((size) => {
        const { unmount } = render(<Button size={size} icon={faCoffee} />);

        const button = screen.getByRole('button');
        expect(button).toHaveClass(`btn-${size}`);

        unmount();
      });
    });
  });

  describe('Icon rendering', () => {
    it('renders FontAwesome icon', () => {
      const { container } = render(<Button size="md" icon={faCoffee} />);

      const fontAwesomeIcon = container.querySelector('svg');
      expect(fontAwesomeIcon).toBeInTheDocument();
    });

    it('accepts different icon definitions', () => {
      const { container: container1 } = render(<Button size="md" icon={faCoffee} />);
      expect(container1.querySelector('svg')).toBeInTheDocument();

      const { container: container2 } = render(<Button size="md" icon={faHeart} />);
      expect(container2.querySelector('svg')).toBeInTheDocument();
    });
  });
});
