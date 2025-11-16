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
  const [selectedChart, setSelectedChart] = useState<'voltage' | 'current' | 'power' | 'frequency'>('voltage');

  const { data: measurements, isLoading, error } = useHistoryData({
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
      'Timestamp',
      'Voltage (V)',
      'Current (A)',
      'Active Power (W)',
      'Apparent Power (VA)',
      'Reactive Power (VAR)',
      'Power Factor',
      'Frequency (Hz)',
      'THD Voltage (%)',
      'THD Current (%)',
    ];

    const rows = measurements.map((m) => [
      m.time ? formatDateTime(m.time) : '',
      m.voltage_rms?.toFixed(2) || '',
      m.current_rms?.toFixed(3) || '',
      m.power_active?.toFixed(2) || '',
      m.power_apparent?.toFixed(2) || '',
      m.power_reactive?.toFixed(2) || '',
      m.cos_phi?.toFixed(3) || '',
      m.frequency?.toFixed(2) || '',
      m.thd_voltage?.toFixed(2) || '',
      m.thd_current?.toFixed(2) || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    a.download = `scada-history-${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Measurement History</h1>
          </div>
          <button
            onClick={exportToCSV}
            disabled={!measurements || measurements.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Time Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {[1, 6, 12, 24, 48, 72, 168].map((hours) => (
                <button
                  key={hours}
                  onClick={() => handleTimeRangeChange(hours)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    timeRange.from === Math.floor(Date.now() / 1000) - hours * 3600
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Last {hours}h
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-4 items-center">
              <label className="text-sm font-medium">
                Limit:
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="ml-2 px-3 py-1 rounded-md bg-secondary"
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
            <p className="mt-4 text-muted-foreground">Loading history...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading history: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Historical Chart */}
        {measurements && measurements.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Historical Trends
                </CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedChart('voltage')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedChart === 'voltage'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Voltage
                  </button>
                  <button
                    onClick={() => setSelectedChart('current')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedChart === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setSelectedChart('power')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedChart === 'power'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Power
                  </button>
                  <button
                    onClick={() => setSelectedChart('frequency')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedChart === 'frequency'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Frequency
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={600}>
                <LineChart data={measurements.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(time) => formatChartTime(time)}
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af' }}
                  />
                  {selectedChart === 'voltage' && (
                    <YAxis
                      stroke="#3b82f6"
                      tick={{ fill: '#9ca3af' }}
                      domain={[220, 240]}
                      label={{
                        value: 'Voltage (V)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#9ca3af' },
                      }}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                  )}
                  {selectedChart === 'current' && (
                    <YAxis
                      stroke="#f59e0b"
                      tick={{ fill: '#9ca3af' }}
                      domain={[0, 'auto']}
                      label={{
                        value: 'Current (A)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#9ca3af' },
                      }}
                    />
                  )}
                  {selectedChart === 'power' && (
                    <YAxis
                      stroke="#10b981"
                      tick={{ fill: '#9ca3af' }}
                      domain={[0, 'auto']}
                      label={{
                        value: 'Active Power (W)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#9ca3af' },
                      }}
                    />
                  )}
                  {selectedChart === 'frequency' && (
                    <YAxis
                      stroke="#8b5cf6"
                      tick={{ fill: '#9ca3af' }}
                      domain={[49.5, 50.5]}
                      label={{
                        value: 'Frequency (Hz)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#9ca3af' },
                      }}
                    />
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelFormatter={(time) => formatDateTime(time)}
                  />
                  {selectedChart === 'voltage' && (
                    <Line
                      type="monotone"
                      dataKey="voltage_rms"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Voltage (V)"
                    />
                  )}
                  {selectedChart === 'current' && (
                    <Line
                      type="monotone"
                      dataKey="current_rms"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Current (A)"
                    />
                  )}
                  {selectedChart === 'power' && (
                    <Line
                      type="monotone"
                      dataKey="power_active"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Active Power (W)"
                    />
                  )}
                  {selectedChart === 'frequency' && (
                    <Line
                      type="monotone"
                      dataKey="frequency"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="Frequency (Hz)"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* History Table */}
        {measurements && measurements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex flex-col gap-1">
                  <span>{measurements.length} Measurements</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    from {formatDate(timeRange.from * 1000)} to{' '}
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
                        Time
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Voltage (V)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Current (A)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Power (W)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        PF
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Freq (Hz)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        THD-V (%)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        THD-I (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr key={m.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          {m.time ? formatDateTime(m.time) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.voltage_rms?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.current_rms?.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.power_active?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.cos_phi?.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.frequency?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.thd_voltage?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono">
                          {m.thd_current?.toFixed(2)}
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
              No measurements found for the selected time range.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
