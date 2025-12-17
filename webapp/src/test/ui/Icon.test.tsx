import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '@/ui/Icon';
import { faCoffee, faHeart } from '@fortawesome/free-solid-svg-icons';

describe('Icon Component', () => {
  it('renders FontAwesome icon', () => {
    const { container } = render(<Icon icon={faCoffee} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders different icon definitions', () => {
    const { container: container1 } = render(<Icon icon={faCoffee} />);
    expect(container1.querySelector('svg')).toBeInTheDocument();

    const { container: container2 } = render(<Icon icon={faHeart} />);
    expect(container2.querySelector('svg')).toBeInTheDocument();
  });

  it('uses FontAwesomeIcon component', () => {
    const { container } = render(<Icon icon={faCoffee} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-icon');
  });

  it('accepts icon prop and renders it', () => {
    const { container } = render(<Icon icon={faCoffee} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  describe('Different icon types', () => {
    it('renders solid icons', () => {
      const { container } = render(<Icon icon={faCoffee} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('svg-inline--fa');
    });

    it('handles multiple icon instances', () => {
      const { container } = render(
        <div>
          <Icon icon={faCoffee} />
          <Icon icon={faHeart} />
        </div>
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
    });
  });
});
