import { ParameterCard } from "@/components/ParameterCard";
import { WaveformChart } from "@/components/WaveformChart";
import { HarmonicsChart } from "@/components/HarmonicsChart";
import type { HarmonicsChartHandle } from "@/components/HarmonicsChart";
import { PowerQualitySection } from "@/components/PowerQualitySection";
import { StreamingChart } from "@/components/StreamingChart";
import { Activity, Loader2, AlertCircle, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { captureAllSections } from "@/hooks/useScreenshotAll";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePowerQualityIndicators } from "@/hooks/usePowerQualityIndicators";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatTime, formatDate } from "@/lib/dateUtils";
import { POWER_QUALITY_LIMITS } from "@/lib/constants";
import type { MeasurementDTO } from "@/types/api";

const Dashboard = () => {
  const [time, setTime] = useState(new Date());
  const { data: dashboardData, isLoading, isError } = useDashboardData();
  const { data: powerQualityData, isLoading: isPqLoading } =
    usePowerQualityIndicators();

  // WebSocket connection for real-time updates
  const { isConnected, data: websocket_data } = useWebSocket({
    url: import.meta.env.VITE_WS_URL || "http://localhost:8080/ws/measurements",
    topic: "/topic/dashboard",
    onError: (error) => {
      console.error("[Dashboard] WebSocket error:", error);
    },
  });

  // Screenshot refs for each dashboard section
  const powerQualityRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const harmonicsRef = useRef<HTMLDivElement>(null);
  const harmonicsChartRef = useRef<HarmonicsChartHandle>(null);

  const handleScreenshotAll = () =>
    captureAllSections([
      { name: "power-quality", ref: powerQualityRef },
      { name: "parameters", ref: parametersRef },
      { name: "streaming-charts", ref: streamingRef },
      { name: "waveform", ref: waveformRef },
      {
        name: "harmonics-voltage-linear",
        ref: harmonicsRef,
        beforeCapture: () => harmonicsChartRef.current?.setView("voltage", "linear"),
      },
      {
        name: "harmonics-voltage-log",
        ref: harmonicsRef,
        beforeCapture: () => harmonicsChartRef.current?.setView("voltage", "log"),
      },
      {
        name: "harmonics-current-linear",
        ref: harmonicsRef,
        beforeCapture: () => harmonicsChartRef.current?.setView("current", "linear"),
      },
      {
        name: "harmonics-current-log",
        ref: harmonicsRef,
        beforeCapture: () => harmonicsChartRef.current?.setView("current", "log"),
      },
    ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to determine status based on value (PN-EN 50160 compliance)
  const getVoltageStatus = (
    voltage: number,
  ): "normal" | "warning" | "critical" => {
    if (
      voltage < POWER_QUALITY_LIMITS.VOLTAGE_MIN ||
      voltage > POWER_QUALITY_LIMITS.VOLTAGE_MAX
    ) {
      return "critical";
    }
    return "normal";
  };

  const getCurrentStatus = (
    current: number,
  ): "normal" | "warning" | "critical" => {
    if (current > POWER_QUALITY_LIMITS.CURRENT_CRITICAL) return "critical";
    if (current > POWER_QUALITY_LIMITS.CURRENT_WARNING) return "warning";
    return "normal";
  };

  const getFrequencyStatus = (
    freq: number,
  ): "normal" | "warning" | "critical" => {
    if (
      freq < POWER_QUALITY_LIMITS.FREQUENCY_MIN ||
      freq > POWER_QUALITY_LIMITS.FREQUENCY_MAX
    ) {
      return "critical";
    }
    return "normal";
  };

  const getStatusLabel = (status: "normal" | "warning" | "critical") => {
    const labels = {
      normal: "Normalny",
      warning: "Ostrzeżenie",
      critical: "Krytyczny",
    };
    return labels[status];
  };

  const getTrend = (
    current: number,
    history: MeasurementDTO[],
    key: keyof MeasurementDTO,
  ): "rising" | "falling" | "stable" => {
    if (!history || history.length < 2) return "stable";
    const previous = history[history.length - 2][key] as number;
    const diff = current - previous;
    const threshold = current * 0.02;

    if (Math.abs(diff) < threshold) return "stable";
    return diff > 0 ? "rising" : "falling";
  };

  return (
    <div className="bg-background grid-pattern">
      {/* Status Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Activity
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isConnected
                      ? "text-success animate-pulse"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {isConnected ? "Aktualizacja na żywo" : "Łączenie..."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleScreenshotAll}
                title="Screenshot wszystkich sekcji"
                className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <div className="text-left sm:text-right">
                <div className="text-sm font-mono text-foreground">
                  {formatTime(time)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(time)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Ładowanie danych...
            </span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">
                  Błąd ładowania danych
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sprawdź czy backend działa na http://192.168.1.53:8080
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PN-EN 50160 Power Quality Indicators */}
        {!isLoading && !isError && (
          <>
            {isPqLoading && (
              <section className="mb-6 sm:mb-8">
                <div className="flex items-center gap-3 bg-card/50 border border-border rounded-lg p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Ładowanie wskaźników jakości energii...
                  </span>
                </div>
              </section>
            )}

            {powerQualityData && !isPqLoading && (
              <div ref={powerQualityRef}>
                <PowerQualitySection data={powerQualityData} />
              </div>
            )}
          </>
        )}

        {/* Real-time Parameters */}
        {dashboardData && dashboardData.latest_measurement && (
          <div ref={parametersRef}>
          <section className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
              <span className="w-1 h-5 sm:h-6 bg-primary rounded-full" />
              Parametry w czasie rzeczywistym
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <ParameterCard
                title="Napięcie"
                value={(dashboardData.latest_measurement.voltage_rms ?? 0).toFixed(1)}
                unit="V"
                status={getVoltageStatus(
                  dashboardData.latest_measurement.voltage_rms ?? 0,
                )}
                statusLabel={getStatusLabel(
                  getVoltageStatus(dashboardData.latest_measurement.voltage_rms ?? 0),
                )}
                min="207"
                max="253"
                trend={getTrend(
                  dashboardData.latest_measurement.voltage_rms ?? 0,
                  dashboardData.recent_history,
                  "voltage_rms",
                )}
              />
              <ParameterCard
                title="Prąd"
                value={(dashboardData.latest_measurement.current_rms ?? 0).toFixed(2)}
                unit="A"
                status={getCurrentStatus(
                  dashboardData.latest_measurement.current_rms ?? 0,
                )}
                statusLabel={getStatusLabel(
                  getCurrentStatus(dashboardData.latest_measurement.current_rms ?? 0),
                )}
                min="0"
                max="16"
                trend={getTrend(
                  dashboardData.latest_measurement.current_rms ?? 0,
                  dashboardData.recent_history,
                  "current_rms",
                )}
              />
              <ParameterCard
                title="Moc czynna"
                value={(
                  (dashboardData.latest_measurement.power_active ?? 0) / 1000
                ).toFixed(2)}
                unit="kW"
                status="normal"
                statusLabel="Normalny"
                min="0"
                max="3.68"
                trend={getTrend(
                  (dashboardData.latest_measurement.power_active ?? 0) / 1000,
                  dashboardData.recent_history,
                  "power_active",
                )}
              />
              <ParameterCard
                title="Częstotliwość"
                value={(dashboardData.latest_measurement.frequency ?? 0).toFixed(2)}
                unit="Hz"
                status={getFrequencyStatus(
                  dashboardData.latest_measurement.frequency ?? 0,
                )}
                statusLabel={getStatusLabel(
                  getFrequencyStatus(
                    dashboardData.latest_measurement.frequency ?? 0,
                  ),
                )}
                min="49.50"
                max="50.50"
                trend={getTrend(
                  dashboardData.latest_measurement.frequency ?? 0,
                  dashboardData.recent_history,
                  "frequency",
                )}
              />
            </div>

            {/* Additional Parameters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6">
              <ParameterCard
                title="Współczynnik mocy"
                value={
                  dashboardData.latest_measurement.power_factor?.toFixed(3) ??
                  "N/A"
                }
                unit="λ"
                status={
                  (dashboardData.latest_measurement.power_factor ?? 0) >=
                  POWER_QUALITY_LIMITS.MIN_POWER_FACTOR
                    ? "normal"
                    : "warning"
                }
                statusLabel={getStatusLabel(
                  (dashboardData.latest_measurement.power_factor ?? 0) >=
                    POWER_QUALITY_LIMITS.MIN_POWER_FACTOR
                    ? "normal"
                    : "warning",
                )}
                min="0.85"
                max="1.0"
                trend={getTrend(
                  dashboardData.latest_measurement.power_factor ?? 0,
                  dashboardData.recent_history,
                  "power_factor",
                )}
              />
              <ParameterCard
                title="Moc bierna"
                value={(
                  (dashboardData.latest_measurement.power_reactive ?? 0) / 1000
                ).toFixed(2)}
                unit="kVAR"
                status="normal"
                statusLabel="Normalny"
                min="0"
                max="2.0"
                trend={getTrend(
                  (dashboardData.latest_measurement.power_reactive ?? 0) / 1000,
                  dashboardData.recent_history,
                  "power_reactive",
                )}
              />
              <ParameterCard
                title="THD napięcia"
                value={(dashboardData.latest_measurement.thd_voltage ?? 0).toFixed(1)}
                unit="%"
                status={
                  (dashboardData.latest_measurement.thd_voltage ?? 0) >
                  POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT
                    ? "critical"
                    : "normal"
                }
                statusLabel={getStatusLabel(
                  (dashboardData.latest_measurement.thd_voltage ?? 0) >
                    POWER_QUALITY_LIMITS.VOLTAGE_THD_LIMIT
                    ? "critical"
                    : "normal",
                )}
                min="0"
                max="8"
                trend={getTrend(
                  dashboardData.latest_measurement.thd_voltage ?? 0,
                  dashboardData.recent_history,
                  "thd_voltage",
                )}
              />
              <ParameterCard
                title="THD prądu"
                value={(dashboardData.latest_measurement.thd_current ?? 0).toFixed(1)}
                unit="%"
                status={
                  (dashboardData.latest_measurement.thd_current ?? 0) >
                  POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT
                    ? "warning"
                    : "normal"
                }
                statusLabel={getStatusLabel(
                  (dashboardData.latest_measurement.thd_current ?? 0) >
                    POWER_QUALITY_LIMITS.CURRENT_THD_LIMIT
                    ? "warning"
                    : "normal",
                )}
                min="0"
                max="5"
                trend={getTrend(
                  dashboardData.latest_measurement.thd_current ?? 0,
                  dashboardData.recent_history,
                  "thd_current",
                )}
              />
            </div>
          </section>
          </div>
        )}

        {/* Real-time Streaming Charts (Oscilloscope-like) */}
        {isConnected && (
          <div ref={streamingRef}>
          <section className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
              <span className="w-1 h-5 sm:h-6 bg-success rounded-full" />
              Wykresy streamingowe (oscyloskop)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <StreamingChart
                parameter_key="voltage_rms"
                title="Napięcie RMS"
                unit="V"
                stroke_color="#3b82f6"
                y_domain={[200, 260]}
                max_buffer_size={30}
                format_value={(v) => v.toFixed(1)}
                latest_measurement={websocket_data?.latest_measurement}
              />
              <StreamingChart
                parameter_key="current_rms"
                title="Prąd RMS"
                unit="A"
                stroke_color="#f59e0b"
                y_domain={[0, "auto"]}
                max_buffer_size={30}
                format_value={(v) => v.toFixed(2)}
                latest_measurement={websocket_data?.latest_measurement}
              />
              <StreamingChart
                parameter_key="frequency"
                title="Częstotliwość"
                unit="Hz"
                stroke_color="#10b981"
                y_domain={[49.5, 50.5]}
                max_buffer_size={30}
                format_value={(v) => v.toFixed(2)}
                latest_measurement={websocket_data?.latest_measurement}
              />
              <StreamingChart
                parameter_key="power_active"
                title="Moc czynna"
                unit="W"
                stroke_color="#8b5cf6"
                y_domain={[0, "auto"]}
                max_buffer_size={30}
                format_value={(v) => (v / 1000).toFixed(2)}
                latest_measurement={websocket_data?.latest_measurement}
              />
            </div>
          </section>
          </div>
        )}

        {/* Waveform Charts */}
        {dashboardData && dashboardData.latest_measurement && dashboardData.waveforms && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
              <span className="w-1 h-5 sm:h-6 bg-primary rounded-full" />
              Przebiegi czasowe i harmoniczne
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div ref={waveformRef}>
                <WaveformChart
                  waveforms={dashboardData.waveforms}
                  frequency={dashboardData.latest_measurement.frequency ?? 50}
                />
              </div>
              <div ref={harmonicsRef}>
                <HarmonicsChart
                  ref={harmonicsChartRef}
                  harmonicsVoltage={dashboardData.latest_measurement.harmonics_v ?? []}
                  harmonicsCurrent={dashboardData.latest_measurement.harmonics_i ?? []}
                  thdVoltage={dashboardData.latest_measurement.thd_voltage ?? 0}
                  thdCurrent={dashboardData.latest_measurement.thd_current ?? 0}
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
