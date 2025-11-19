import { ParameterCard } from "@/components/ParameterCard";
import { WaveformChart } from "@/components/WaveformChart";
import { HarmonicsChart } from "@/components/HarmonicsChart";
import { Activity, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatTime, formatDate } from "@/lib/dateUtils";

const Dashboard = () => {
  const [time, setTime] = useState(new Date());
  const { data: dashboardData, isLoading, isError } = useDashboardData();

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    url: import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws/measurements',
    topic: '/topic/dashboard',
    onMessage: (data) => {
      console.log('[Dashboard] Real-time update received:', data.latest_measurement.voltage_rms);
    },
    onError: (error) => {
      console.error('[Dashboard] WebSocket error:', error);
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to determine status based on value
  const getVoltageStatus = (voltage: number) => {
    if (voltage < 207 || voltage > 253) return "critical"; // IEC 61000 limits ±10%
    if (voltage < 220 || voltage > 240) return "warning";
    return "normal";
  };

  const getCurrentStatus = (current: number) => {
    if (current > 16) return "critical"; // 16A typical household limit
    if (current > 13) return "warning";
    return "normal";
  };

  const getFrequencyStatus = (freq: number) => {
    if (freq < 49.5 || freq > 50.5) return "critical";
    if (freq < 49.8 || freq > 50.2) return "warning";
    return "normal";
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
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${isConnected ? "text-success animate-pulse" : "text-muted-foreground"}`}
                />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {isConnected ? "Live Updates" : "Connecting..."}
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading dashboard data...
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
                  Failed to load dashboard data
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Make sure the backend is running on http://localhost:8080
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Parameters */}
        {dashboardData && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
              <span className="w-1 h-5 sm:h-6 bg-primary rounded-full" />
              Real-time Parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <ParameterCard
                title="Voltage"
                value={dashboardData.latest_measurement.voltage_rms.toFixed(1)}
                unit="V"
                status={getVoltageStatus(
                  dashboardData.latest_measurement.voltage_rms
                )}
                min="207"
                max="253"
                trend="stable"
              />
              <ParameterCard
                title="Current"
                value={dashboardData.latest_measurement.current_rms.toFixed(2)}
                unit="A"
                status={getCurrentStatus(
                  dashboardData.latest_measurement.current_rms
                )}
                min="0"
                max="16"
                trend="stable"
              />
              <ParameterCard
                title="Active Power"
                value={(
                  dashboardData.latest_measurement.power_active / 1000
                ).toFixed(2)}
                unit="kW"
                status="normal"
                min="0"
                max="3.68"
                trend="stable"
              />
              <ParameterCard
                title="Frequency"
                value={dashboardData.latest_measurement.frequency.toFixed(2)}
                unit="Hz"
                status={getFrequencyStatus(
                  dashboardData.latest_measurement.frequency
                )}
                min="49.50"
                max="50.50"
                trend="stable"
              />
            </div>

            {/* Additional Parameters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6">
              <ParameterCard
                title="Power Factor"
                value={dashboardData.latest_measurement.cos_phi.toFixed(3)}
                unit="cos φ"
                status={
                  dashboardData.latest_measurement.cos_phi > 0.9
                    ? "normal"
                    : "warning"
                }
                min="0.8"
                max="1.0"
                trend="stable"
              />
              <ParameterCard
                title="Reactive Power"
                value={(
                  dashboardData.latest_measurement.power_reactive / 1000
                ).toFixed(2)}
                unit="kVAR"
                status="normal"
                min="0"
                max="2.0"
                trend="stable"
              />
              <ParameterCard
                title="THD Voltage"
                value={dashboardData.latest_measurement.thd_voltage.toFixed(1)}
                unit="%"
                status={
                  dashboardData.latest_measurement.thd_voltage > 8
                    ? "critical"
                    : "normal"
                }
                min="0"
                max="8"
                trend="stable"
              />
              <ParameterCard
                title="THD Current"
                value={dashboardData.latest_measurement.thd_current.toFixed(1)}
                unit="%"
                status={
                  dashboardData.latest_measurement.thd_current > 8
                    ? "warning"
                    : "normal"
                }
                min="0"
                max="8"
                trend="stable"
              />
            </div>
          </section>
        )}

        {/* Waveform Charts */}
        {dashboardData && (
          <section className="mb-6 sm:mb-8">
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <WaveformChart
                waveforms={dashboardData.waveforms}
                frequency={dashboardData.latest_measurement.frequency}
              />
              <HarmonicsChart
                harmonicsVoltage={dashboardData.latest_measurement.harmonics_v}
                harmonicsCurrent={dashboardData.latest_measurement.harmonics_i}
                thdVoltage={dashboardData.latest_measurement.thd_voltage}
                thdCurrent={dashboardData.latest_measurement.thd_current}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
