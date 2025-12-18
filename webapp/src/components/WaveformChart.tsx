import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WaveformDTO } from "@/types/api";
import { TrendingUp } from "lucide-react";

interface WaveformChartProps {
  waveforms: WaveformDTO;
  frequency: number;
}

export function WaveformChart({ waveforms, frequency }: WaveformChartProps) {
  if (waveforms.voltage.length != waveforms.current.length) {
    throw new Error("Voltage and current arrays must have the same length");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Błąd: Niezgodne dane falowe</CardTitle>
        </CardHeader>
        <CardContent>
          Długości tablic napięcia i prądu muszą być takie same.
        </CardContent>
      </Card>
    )
  }
  // Transformacja danych do formatu Recharts
  const chartData = waveforms.voltage.map((v, index) => ({
    sample: index,
    time: (index / waveforms.voltage.length) * (1000 / frequency),
    voltage: v,
    current: waveforms.current[index],
  }));

  const maxVoltage = Math.max(...waveforms.voltage.map(Math.abs));
  const voltageDomain = [-maxVoltage * 1.1, maxVoltage * 1.1];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">Analiza Fazowa (Oscyloskop)</span>
          </CardTitle>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          Napięcie (niebieski) i Prąd (pomarańczowy) na niezależnych osiach ({frequency.toFixed(1)} Hz)
        </p>
      </CardHeader>
      <CardContent className="pt-2 pb-2 px-2 sm:px-4">
        <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(1)}ms`}
                label={{
                  value: "Czas (ms)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "#e5e7eb", fontSize: 12 },
                }}
                height={50}
              />
              
              {/* LEWA OŚ DLA NAPIĘCIA */}
              <YAxis 
                yAxisId="v-axis" 
                orientation="left"
                stroke="#3b82f6"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={voltageDomain}
                width={60}
                tickFormatter={(value) => value.toFixed(0)}
              />
              
              {/* PRAWA OŚ DLA PRĄDU */}
              <YAxis 
                yAxisId="i-axis" 
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={['auto', 'auto']}
                width={60}
                tickFormatter={(value) => value.toFixed(2)}
              />

              <Tooltip 
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                itemStyle={{ color: "#e5e7eb" }}
                labelFormatter={(time) => `${time.toFixed(1)} ms`}
              />

              <Line
                yAxisId="v-axis"
                type="monotone"
                dataKey="voltage"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Napięcie (V)"
                isAnimationActive={false}
              />
              
              <Line
                yAxisId="i-axis"
                type="monotone"
                dataKey="current"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Prąd (A)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}