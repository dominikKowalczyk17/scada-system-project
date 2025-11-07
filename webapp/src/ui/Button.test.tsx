/**
 * Unit tests for Button component
 * Demonstrates basic Vitest + React Testing Library usage
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';

describe('Button Component', () => {
  it('renders button with correct size class', () => {
    render(<Button size="md" icon={faCoffee} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
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
});
