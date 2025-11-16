import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
        <CardTitle className="flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />
          Harmonic Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          THD Voltage: {thdVoltage.toFixed(2)}% | THD Current:{" "}
          {thdCurrent.toFixed(2)}% (IEC 61000 limit: 8%)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="harmonic"
              label={{
                value: "Harmonic Order",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#9ca3af" },
              }}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis
              scale="log"
              domain={[0.1, "auto"]}
              label={{
                value: "Amplitude (logarithmic scale)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#9ca3af" },
              }}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(value: number, name: string) => [
                value.toFixed(3),
                name === "voltage" ? "Voltage (V)" : "Current (A)",
              ]}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.harmonic === label);
                return item ? `${label} (${item.frequency} Hz)` : label;
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af" }} />
            <Bar dataKey="voltage" fill="#3b82f6" name="Voltage (V)" />
            <Bar dataKey="current" fill="#f59e0b" name="Current (A)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
