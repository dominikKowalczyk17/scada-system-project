import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface HarmonicsChartProps {
  harmonicsVoltage: number[];
  harmonicsCurrent: number[];
  thdVoltage: number;
  thdCurrent: number;
}

export function HarmonicsChart({
  harmonicsVoltage,
  harmonicsCurrent,
  thdVoltage,
  thdCurrent,
}: HarmonicsChartProps) {
  const [selectedHarmonic, setSelectedHarmonic] = useState<'voltage' | 'current'>('voltage');

  // Transform harmonics arrays into Recharts format
  // harmonicsVoltage = [H1, H2, H3, ..., H8]
  // H1 = fundamental (50Hz), H2 = 2nd harmonic (100Hz), etc.
  const chartData = harmonicsVoltage.map((vHarmonic, index) => ({
    harmonic: `H${index + 1}`,
    frequency: (index + 1) * 50, // 50Hz, 100Hz, 150Hz, ..., 400Hz
    voltage: vHarmonic,
    current: harmonicsCurrent[index],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Harmonic Analysis
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedHarmonic('voltage')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedHarmonic === 'voltage'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Voltage
            </button>
            <button
              onClick={() => setSelectedHarmonic('current')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedHarmonic === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Current
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          THD Voltage: {thdVoltage.toFixed(2)}% | THD Current:{" "}
          {thdCurrent.toFixed(2)}% (IEC 61000 limit: 8%)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} barSize={40} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="harmonic"
              label={{
                value: "Harmonic Order",
                position: "insideBottom",
                offset: -10,
                style: { fill: "#9ca3af" },
              }}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
              height={60}
            />
            <YAxis
              scale="log"
              domain={[0.001, 300]}
              label={{
                value: selectedHarmonic === 'voltage' ? "Voltage (%)" : "Current (%)",
                angle: -90,
                position: "center",
                style: { fill: "#9ca3af" },
              }}
              stroke={selectedHarmonic === 'voltage' ? "#3b82f6" : "#f59e0b"}
              tick={{ fill: "#9ca3af" }}
              tickFormatter={(value) => `${Math.round(value)}%`}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => [
                value.toFixed(3),
                selectedHarmonic === "voltage" ? "Voltage (V)" : "Current (A)",
              ]}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.harmonic === label);
                return item ? `${label} (${item.frequency} Hz)` : label;
              }}
            />
            {selectedHarmonic === 'voltage' && (
              <Bar
                dataKey="voltage"
                fill="#3b82f6"
                name="Voltage (V)"
                radius={[4, 4, 0, 0]}
              />
            )}
            {selectedHarmonic === 'current' && (
              <Bar
                dataKey="current"
                fill="#f59e0b"
                name="Current (A)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
