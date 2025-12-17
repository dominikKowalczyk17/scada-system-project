import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PowerQualitySection } from '@/components/PowerQualitySection';
import type { PowerQualityIndicatorsDTO } from '@/types/api';

describe('PowerQualitySection Component', () => {
  const mockPowerQualityData: PowerQualityIndicatorsDTO = {
    voltage_rms: 230.5,
    voltage_deviation_percent: 0.22,
    voltage_within_limits: true,
    frequency: 50.02,
    frequency_deviation_hz: 0.02,
    frequency_within_limits: true,
    thd_voltage: 5.2,
    thd_within_limits: true,
    overall_compliant: true,
    harmonics_voltage: [230.0, 8.5, 6.2],
    timestamp: '2024-06-01T12:00:00Z',
    status_message: 'Wszystkie parametry w normie',
  };

  describe('Rendering', () => {
    it('renders section title', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Wskaźniki jakości energii/i)).toBeInTheDocument();
    });

    it('renders overall compliance status', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Wszystkie parametry w normie/i)).toBeInTheDocument();
    });

    it('renders voltage deviation card', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Odchylenie napięcia/i)).toBeInTheDocument();
      expect(screen.getByText('230.5 V')).toBeInTheDocument();
    });

    it('renders frequency deviation card', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Odchylenie częstotliwości/i)).toBeInTheDocument();
      expect(screen.getByText('50.02 Hz')).toBeInTheDocument();
    });

    it('renders THD voltage card', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/THD napięcia/i)).toBeInTheDocument();
      expect(screen.getByText('5.2%')).toBeInTheDocument();
    });
  });

  describe('Voltage Deviation Display', () => {
    it('displays voltage RMS value', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('230.5 V')).toBeInTheDocument();
    });

    it('displays voltage deviation percentage', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/0\.22%/)).toBeInTheDocument();
    });

    it('displays voltage limits (207V - 253V)', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/207V/)).toBeInTheDocument();
      expect(screen.getByText(/253V/)).toBeInTheDocument();
    });

    it('shows compliance badge for voltage', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const complianceBadges = screen.getAllByText(/W normie/);
      expect(complianceBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Frequency Deviation Display', () => {
    it('displays frequency value', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('50.02 Hz')).toBeInTheDocument();
    });

    it('displays frequency deviation in Hz', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const elements = screen.getAllByText(/0\.02 Hz/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('displays frequency limits (49.5Hz - 50.5Hz)', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/49\.5Hz/)).toBeInTheDocument();
      expect(screen.getByText(/50\.5Hz/)).toBeInTheDocument();
    });
  });

  describe('THD Display', () => {
    it('displays THD voltage percentage', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('5.2%')).toBeInTheDocument();
    });

    it('displays harmonics range (H2-H8)', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const elements = screen.getAllByText(/H2-H8/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows warning about partial measurement', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Ograniczenia pomiarowe/i)).toBeInTheDocument();
      expect(screen.getByText(/Ograniczenie Nyquista/i)).toBeInTheDocument();
    });

    it('explains the measurement limitation', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/800Hz/)).toBeInTheDocument();
      expect(screen.getByText(/dolne ograniczenie/i)).toBeInTheDocument();
    });
  });

  describe('Compliance Indicators', () => {
    it('shows green compliance badge for compliant values', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const badges = screen.getAllByText(/W normie/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows red compliance badge for non-compliant values', () => {
      const nonCompliantData: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        voltage_within_limits: false,
        overall_compliant: false,
        status_message: 'Wykryto odchylenia',
      };

      render(<PowerQualitySection data={nonCompliantData} />);

      expect(screen.getByText(/Poza normą/)).toBeInTheDocument();
    });

    it('shows overall compliance status', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Wszystko OK/)).toBeInTheDocument();
    });

    it('shows warning status when not compliant', () => {
      const nonCompliantData: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        overall_compliant: false,
        status_message: 'Wykryto odchylenia',
      };

      render(<PowerQualitySection data={nonCompliantData} />);

      const elements = screen.getAllByText(/Wykryto odchylenia/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Cards and Layout', () => {
    it('renders three main indicator cards (voltage, frequency, THD)', () => {
      const { container } = render(
        <PowerQualitySection data={mockPowerQualityData} />
      );

      const cards = container.querySelectorAll('[class*="shadow-card"]');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders cards in grid layout', () => {
      const { container } = render(
        <PowerQualitySection data={mockPowerQualityData} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('renders compliance summary card', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Podsumowanie zgodności/i)).toBeInTheDocument();
    });
  });

  describe('Standard Reference', () => {
    it('references PN-EN 50160 standard', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const elements = screen.getAllByText(/PN-EN 50160/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('displays standard full name', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Parametry napięcia zasilającego/i)).toBeInTheDocument();
    });

    it('shows Nyquist limitation explanation', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Ograniczenie Nyquista/i)).toBeInTheDocument();
      expect(screen.getByText(/IEC 61000-4-7/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('handles null deviation values', () => {
      const dataWithNullValues: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        voltage_deviation_percent: null,
        frequency_deviation_hz: null,
      };

      render(<PowerQualitySection data={dataWithNullValues} />);

      const naValues = screen.getAllByText(/N\/A/);
      expect(naValues.length).toBeGreaterThan(0);
    });

    it('handles null compliance status', () => {
      const dataWithNullStatus: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        voltage_within_limits: null,
        frequency_within_limits: null,
        thd_within_limits: null,
        overall_compliant: null,
      };

      render(<PowerQualitySection data={dataWithNullStatus} />);

      const noDatBadges = screen.getAllByText(/Brak danych/);
      expect(noDatBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Warning Messages', () => {
    it('shows alert box when not overall compliant', () => {
      const nonCompliantData: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        overall_compliant: false,
        status_message: 'Napięcie poza normą',
      };

      render(<PowerQualitySection data={nonCompliantData} />);

      expect(screen.getByText(/Ostrzeżenie/i)).toBeInTheDocument();
      const elements = screen.getAllByText(/Napięcie poza normą/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows Nyquist limitation info box', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      const infoBox = screen.getByText(/Ograniczenia pomiarowe/i);
      expect(infoBox).toBeInTheDocument();
    });

    it('explains partial THD measurement impact', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/THD obliczane tylko z harmonicznych H2-H8/i)).toBeInTheDocument();
      expect(screen.getByText(/dolne ograniczenie/i)).toBeInTheDocument();
    });
  });

  describe('Group Labels', () => {
    it('displays Group 1 label for voltage', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Grupa 1 PN-EN 50160/i)).toBeInTheDocument();
    });

    it('displays Group 2 label for frequency', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Grupa 2 PN-EN 50160/i)).toBeInTheDocument();
    });

    it('displays Group 4 label for THD', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Grupa 4 PN-EN 50160/i)).toBeInTheDocument();
    });

    it('indicates partial measurement for THD', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/\(częściowe\)/)).toBeInTheDocument();
    });
  });

  describe('Dynamic Updates', () => {
    it('updates voltage display when prop changes', () => {
      const { rerender } = render(
        <PowerQualitySection data={mockPowerQualityData} />
      );

      expect(screen.getByText('230.5 V')).toBeInTheDocument();

      const updatedData: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        voltage_rms: 235.0,
      };

      rerender(<PowerQualitySection data={updatedData} />);

      expect(screen.getByText('235.0 V')).toBeInTheDocument();
      expect(screen.queryByText('230.5 V')).not.toBeInTheDocument();
    });

    it('updates compliance badge when status changes', () => {
      const { rerender } = render(
        <PowerQualitySection data={mockPowerQualityData} />
      );

      expect(screen.getByText(/Wszystko OK/)).toBeInTheDocument();

      const nonCompliantData: PowerQualityIndicatorsDTO = {
        ...mockPowerQualityData,
        overall_compliant: false,
        status_message: 'Wykryto odchylenia',
      };

      rerender(<PowerQualitySection data={nonCompliantData} />);

      const elements = screen.getAllByText(/Wykryto odchylenia/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Formatting and Precision', () => {
    it('formats voltage to one decimal place', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('230.5 V')).toBeInTheDocument();
    });

    it('formats frequency to two decimal places', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('50.02 Hz')).toBeInTheDocument();
    });

    it('formats THD to one decimal place', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText('5.2%')).toBeInTheDocument();
    });

    it('formats deviation percentages with correct precision', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/0\.22%/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading structure', () => {
      const { container } = render(
        <PowerQualitySection data={mockPowerQualityData} />
      );

      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();
    });

    it('provides text descriptions for icons', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      // Component should provide text content alongside icons
      expect(screen.getByText(/Wskaźniki jakości energii/i)).toBeInTheDocument();
    });

    it('includes info boxes for measurement limitations', () => {
      render(<PowerQualitySection data={mockPowerQualityData} />);

      expect(screen.getByText(/Ograniczenia pomiarowe/i)).toBeInTheDocument();
    });
  });
});
