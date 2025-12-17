import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/ui/Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders card element with correct classes', () => {
      const { container } = render(
        <Card>Test content</Card>
      );

      const card = container.firstChild;
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('renders children', () => {
      render(<Card>Test content</Card>);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <Card className="custom-class">Test</Card>
      );

      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      const { container } = render(
        <Card ref={ref}>Test</Card>
      );

      expect(ref.current).toBe(container.firstChild);
    });
  });

  describe('CardHeader', () => {
    it('renders with correct classes', () => {
      const { container } = render(
        <CardHeader>Header</CardHeader>
      );

      const header = container.firstChild;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('renders children', () => {
      render(<CardHeader>Header text</CardHeader>);

      expect(screen.getByText('Header text')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardHeader className="custom">Header</CardHeader>
      );

      const header = container.firstChild;
      expect(header).toHaveClass('custom');
    });
  });

  describe('CardTitle', () => {
    it('renders h3 element', () => {
      render(<CardTitle>Title</CardTitle>);

      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H3');
    });

    it('renders with correct classes', () => {
      const { container } = render(
        <CardTitle>Title</CardTitle>
      );

      const title = container.firstChild;
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('renders children text', () => {
      render(<CardTitle>My Title</CardTitle>);

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('renders p element', () => {
      render(<CardDescription>Description</CardDescription>);

      const description = screen.getByText('Description');
      expect(description.tagName).toBe('P');
    });

    it('renders with correct classes', () => {
      const { container } = render(
        <CardDescription>Description</CardDescription>
      );

      const description = container.firstChild;
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('renders children text', () => {
      render(<CardDescription>My description</CardDescription>);

      expect(screen.getByText('My description')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders with correct classes', () => {
      const { container } = render(
        <CardContent>Content</CardContent>
      );

      const content = container.firstChild;
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('renders children', () => {
      render(<CardContent>Test content</CardContent>);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardContent className="custom">Content</CardContent>
      );

      const content = container.firstChild;
      expect(content).toHaveClass('custom');
    });
  });

  describe('CardFooter', () => {
    it('renders with correct classes', () => {
      const { container } = render(
        <CardFooter>Footer</CardFooter>
      );

      const footer = container.firstChild;
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('renders children', () => {
      render(<CardFooter>Footer content</CardFooter>);

      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardFooter className="custom">Footer</CardFooter>
      );

      const footer = container.firstChild;
      expect(footer).toHaveClass('custom');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders complete card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Card content here</CardContent>
          <CardFooter>Card footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Card content here')).toBeInTheDocument();
      expect(screen.getByText('Card footer')).toBeInTheDocument();
    });
  });
});
