import { Card } from "@/ui/Card";
import { AlertTriangle, CheckCircle2, XCircle, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PowerQualityIndicatorsDTO } from "../types/api";

interface PowerQualitySectionProps {
  data: PowerQualityIndicatorsDTO;
}

/**
 * Component displaying PN-EN 50160 power quality indicators.
 *
 * Shows standardized power quality metrics:
 * - Group 1: Voltage deviation from 230V (±10% limit)
 * - Group 2: Frequency deviation from 50Hz (±0.5Hz limit)
 * - Group 4: THD voltage (8% limit, partial measurement warning)
 *
 * Each indicator shows:
 * - Current value
 * - Deviation from nominal
 * - Compliance status (green/yellow/red)
 * - PN-EN 50160 limits
 */
export function PowerQualitySection({ data }: PowerQualitySectionProps) {
  const getComplianceIcon = (within_limits: boolean | null) => {
    if (within_limits === null) {
      return <Info className="w-5 h-5 text-muted-foreground" />;
    }
    return within_limits ? (
      <CheckCircle2 className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  const getComplianceBadge = (within_limits: boolean | null) => {
    if (within_limits === null) {
      return (
        <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-muted/10 text-muted-foreground border border-muted/20">
          Brak danych
        </span>
      );
    }
    return (
      <span className={cn(
        "ml-2 px-2 py-0.5 rounded text-xs font-semibold",
        within_limits
          ? "bg-success/10 text-success border border-success/20"
          : "bg-destructive/10 text-destructive border border-destructive/20"
      )}>
        {within_limits ? "W normie" : "Poza normą"}
      </span>
    );
  };

  return (
    <section className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 sm:h-6 bg-primary rounded-full" />
          Wskaźniki jakości energii PN-EN 50160
        </h2>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5",
          data.overall_compliant === null
            ? "bg-muted/10 text-muted-foreground border border-muted/20"
            : data.overall_compliant
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
        )}>
          <Activity className="w-3 h-3" />
          {data.overall_compliant === null ? "Brak pełnych danych" : data.overall_compliant ? "Wszystko OK" : "Wykryto odchylenia"}
        </span>
      </div>

      {/* Overall Status Message */}
      {data.overall_compliant === false && (
        <Card className="mb-4 bg-destructive/5 border-destructive/20">
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-destructive text-sm">Ostrzeżenie</h4>
              <p className="text-sm text-muted-foreground mt-1">{data.status_message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Warning about partial THD measurement */}
      <Card className="mb-4 bg-yellow-500/5 border-yellow-500/20">
        <div className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">
              Ograniczenia pomiarowe
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              THD obliczane tylko z harmonicznych H2-H8 (ograniczenie Nyquista przy 800Hz).
              Wartość reprezentuje <strong>dolne ograniczenie</strong> rzeczywistego THD.
              Pełna norma IEC 61000-4-7 wymaga harmonicznych H2-H40.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Group 1: Voltage Deviation */}
        <Card className="bg-card border-border shadow-card p-4 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-semibold text-foreground">Odchylenie napięcia</span>
              {getComplianceIcon(data.voltage_within_limits)}
            </div>
            <span className="text-xs text-muted-foreground">Grupa 1 PN-EN 50160</span>
          </div>
          <div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {data.voltage_rms.toFixed(1)} V
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Odchylenie: {data.voltage_deviation_percent !== null ? (
                    <>
                      {data.voltage_deviation_percent > 0 ? "+" : ""}
                      {data.voltage_deviation_percent.toFixed(2)}%
                    </>
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Limit: 230V ±10%
                </span>
                {getComplianceBadge(data.voltage_within_limits)}
              </div>
              <div className="text-xs text-muted-foreground">
                Zakres: 207V - 253V
              </div>
            </div>
          </div>
        </Card>

        {/* Group 2: Frequency Deviation */}
        <Card className="bg-card border-border shadow-card p-4 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-semibold text-foreground">Odchylenie częstotliwości</span>
              {getComplianceIcon(data.frequency_within_limits)}
            </div>
            <span className="text-xs text-muted-foreground">Grupa 2 PN-EN 50160</span>
          </div>
          <div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {data.frequency.toFixed(2)} Hz
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Odchylenie: {data.frequency_deviation_hz !== null ? (
                    <>
                      {data.frequency_deviation_hz > 0 ? "+" : ""}
                      {data.frequency_deviation_hz.toFixed(2)} Hz
                    </>
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Limit: 50Hz ±0.5Hz
                </span>
                {getComplianceBadge(data.frequency_within_limits)}
              </div>
              <div className="text-xs text-muted-foreground">
                Zakres: 49.5Hz - 50.5Hz
              </div>
            </div>
          </div>
        </Card>

        {/* Group 4: THD Voltage (Partial) */}
        <Card className="bg-card border-border shadow-card p-4 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-semibold text-foreground">THD napięcia</span>
              {getComplianceIcon(data.thd_within_limits)}
            </div>
            <span className="text-xs text-muted-foreground">Grupa 4 PN-EN 50160 (częściowe)</span>
          </div>
          <div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {data.thd_voltage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Harmoniczne: H2-H8 (8 wartości)
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Limit: {'<'}8%
                </span>
                {getComplianceBadge(data.thd_within_limits)}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Pomiar częściowy (H2-H8)
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Summary */}
      <Card className="mt-4 bg-card border-border shadow-card p-4 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Podsumowanie zgodności</h3>
        <div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Status ogólny:</span>
              <span className={
                data.overall_compliant === null
                  ? "text-muted-foreground font-semibold"
                  : data.overall_compliant
                    ? "text-success font-semibold"
                    : "text-destructive font-semibold"
              }>
                {data.status_message}
              </span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Norma: PN-EN 50160:2010 - Parametry napięcia zasilającego w publicznych sieciach elektroenergetycznych
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
