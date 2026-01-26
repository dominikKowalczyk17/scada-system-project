import { useState } from 'react';
import { useHistoryData } from '../hooks/useHistoryData';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card';
import { History as HistoryIcon, Calendar, Download, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDateTime, formatChartTime, formatDate } from '@/lib/dateUtils';

export default function History() {
  // Default: last 24 hours
  const [timeRange, setTimeRange] = useState({
    from: Math.floor(Date.now() / 1000) - 86400,
    to: Math.floor(Date.now() / 1000),
  });
  const [limit, setLimit] = useState(100);
  const [selectedChart, setSelectedChart] = useState<
    "voltage" | "current" | "power" | "frequency"
  >("voltage");

  const {
    data: measurements,
    isLoading,
    error,
  } = useHistoryData({
    from: timeRange.from,
    to: timeRange.to,
    limit,
  });

  const handleTimeRangeChange = (hours: number) => {
    setTimeRange({
      from: Math.floor(Date.now() / 1000) - hours * 3600,
      to: Math.floor(Date.now() / 1000),
    });
  };

  const exportToCSV = () => {
    if (!measurements) return;

    const headers = [
      "Czas",
      "Napięcie (V)",
      "Prąd (A)",
      "Moc czynna (W)",
      "Moc pozorna (VA)",
      "Moc bierna (VAR)",
      "Współczynnik mocy",
      "Częstotliwość (Hz)",
      "THD napięcia (%)",
      "THD prądu (%)",
    ];

    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = measurements.map((m) => [
      m.time ? formatDateTime(m.time) : "",
      m.voltage_rms?.toFixed(2) ?? "",
      m.current_rms?.toFixed(3) ?? "",
      m.power_active?.toFixed(2) ?? "",
      m.power_apparent?.toFixed(2) ?? "",
      m.power_reactive?.toFixed(2) ?? "",
      m.power_factor?.toFixed(3) ?? "",
      m.frequency?.toFixed(2) ?? "",
      m.thd_voltage?.toFixed(2) ?? "",
      m.thd_current?.toFixed(2) ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    a.download = `scada-history-${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <HistoryIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Historia pomiarów
            </h1>
          </div>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={!measurements || measurements.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Eksportuj CSV</span>
          </button>
        </div>

        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-base sm:text-lg">Zakres czasowy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {[1, 6, 12, 24, 48, 72, 168].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => handleTimeRangeChange(hours)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm transition-colors ${
                    timeRange.from ===
                    Math.floor(Date.now() / 1000) - hours * 3600
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Ostatnie {hours}h
                </button>
              ))}
            </div>
            <div className="mt-3 sm:mt-4 flex gap-3 sm:gap-4 items-center">
              <label className="text-xs sm:text-sm font-medium">
                Limit:
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="ml-2 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md bg-secondary"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Loading/Error States */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Ładowanie historii...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Błąd ładowania historii:{" "}
                {error instanceof Error ? error.message : "Nieznany błąd"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Historical Chart */}
        {measurements && measurements.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-lg">
                    Trendy historyczne
                  </span>
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedChart("voltage")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                      selectedChart === "voltage"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Napięcie
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChart("current")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                      selectedChart === "current"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Prąd
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChart("power")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                      selectedChart === "power"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Moc
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChart("frequency")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                      selectedChart === "frequency"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Częstotliwość
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[450px] lg:h-[600px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurements.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(time) => formatChartTime(time)}
                      stroke="#6b7280"
                      tick={{ fill: "#e5e7eb", fontSize: 11 }}
                      height={50}
                      label={{
                        value: "Czas",
                        position: "insideBottom",
                        offset: -5,
                        style: { fill: "#e5e7eb", fontSize: 12 },
                      }}
                    />
                    {selectedChart === "voltage" && (
                      <YAxis
                        stroke="#3b82f6"
                        tick={{ fill: "#e5e7eb", fontSize: 11 }}
                        domain={[210, 250]}
                        label={{
                          value: "Napięcie (V)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: {
                            fill: "#e5e7eb",
                            fontSize: 12,
                            textAnchor: "middle",
                          },
                        }}
                        tickFormatter={(value) => value.toFixed(0)}
                        width={60}
                      />
                    )}
                    {selectedChart === "current" && (
                      <YAxis
                        stroke="#f59e0b"
                        tick={{ fill: "#e5e7eb", fontSize: 11 }}
                        domain={[0, "auto"]}
                        label={{
                          value: "Prąd (A)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: {
                            fill: "#e5e7eb",
                            fontSize: 12,
                            textAnchor: "middle",
                          },
                        }}
                        tickFormatter={(value) => value.toFixed(2)}
                        width={60}
                      />
                    )}
                    {selectedChart === "power" && (
                      <YAxis
                        stroke="#10b981"
                        tick={{ fill: "#e5e7eb", fontSize: 11 }}
                        domain={[0, "auto"]}
                        label={{
                          value: "Moc czynna (W)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: {
                            fill: "#e5e7eb",
                            fontSize: 12,
                            textAnchor: "middle",
                          },
                        }}
                        tickFormatter={(value) =>
                          value >= 1000
                            ? `${(value / 1000).toFixed(1)}k`
                            : value.toFixed(0)
                        }
                        width={60}
                      />
                    )}
                    {selectedChart === "frequency" && (
                      <YAxis
                        stroke="#8b5cf6"
                        tick={{ fill: "#e5e7eb", fontSize: 11 }}
                        domain={[49.5, 50.5]}
                        label={{
                          value: "Częstotliwość (Hz)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: {
                            fill: "#e5e7eb",
                            fontSize: 12,
                            textAnchor: "middle",
                          },
                        }}
                        tickFormatter={(value) => value.toFixed(2)}
                        width={60}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                      itemStyle={{ color: "#e5e7eb" }}
                      labelFormatter={(time) => formatDateTime(time)}
                    />
                    {selectedChart === "voltage" && (
                      <Line
                        type="monotone"
                        dataKey="voltage_rms"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Napięcie (V)"
                      />
                    )}
                    {selectedChart === "current" && (
                      <Line
                        type="monotone"
                        dataKey="current_rms"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        name="Prąd (A)"
                      />
                    )}
                    {selectedChart === "power" && (
                      <Line
                        type="monotone"
                        dataKey="power_active"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Moc czynna (W)"
                      />
                    )}
                    {selectedChart === "frequency" && (
                      <Line
                        type="monotone"
                        dataKey="frequency"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        name="Częstotliwość (Hz)"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Table */}
        {measurements && measurements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex flex-col gap-1">
                  <span>Pomiarów: {measurements.length}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    od {formatDate(timeRange.from * 1000)} do{" "}
                    {formatDate(timeRange.to * 1000)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Czas
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Napięcie (V)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Prąd (A)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Moc (W)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        λ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Częst. (Hz)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        THD-U (%)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        THD-I (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-sm">
                          {m.time ? formatDateTime(m.time) : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.voltage_rms?.toFixed(2) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.current_rms?.toFixed(3) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.power_active?.toFixed(2) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.power_factor?.toFixed(3) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.frequency?.toFixed(2) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.thd_voltage?.toFixed(2) ?? "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.thd_current?.toFixed(2) ?? "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {measurements && measurements.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Brak pomiarów dla wybranego zakresu czasowego.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}