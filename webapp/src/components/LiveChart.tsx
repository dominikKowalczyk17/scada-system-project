import { Card } from "@/ui/Card";
import { useEffect, useState } from "react";

export const LiveChart = () => {
  const [dataPoints, setDataPoints] = useState<number[]>(
    Array.from({ length: 50 }, () => Math.random() * 30 + 220)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints((prev) => {
        const newData = [...prev.slice(1), Math.random() * 30 + 220];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const max = Math.max(...dataPoints);
  const min = Math.min(...dataPoints);
  const range = max - min;

  return (
    <Card className="bg-card border-border shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Voltage Trend (kV)</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Real-time</span>
          </div>
          <span className="font-mono text-primary">{dataPoints[dataPoints.length - 1].toFixed(2)} kV</span>
        </div>
      </div>

      <div className="relative h-48 grid-pattern rounded-lg overflow-hidden bg-background/50">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d={dataPoints
              .map((value, index) => {
                const x = (index / (dataPoints.length - 1)) * 100;
                const y = ((max - value) / range) * 100;
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="drop-shadow-[0_0_8px_hsl(var(--primary))]"
          />

          <path
            d={`${dataPoints
              .map((value, index) => {
                const x = (index / (dataPoints.length - 1)) * 100;
                const y = ((max - value) / range) * 100;
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')} L 100 100 L 0 100 Z`}
            fill="url(#chartGradient)"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Min: <span className="font-mono">{min.toFixed(2)}</span></span>
        <span>Avg: <span className="font-mono">{(dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length).toFixed(2)}</span></span>
        <span>Max: <span className="font-mono">{max.toFixed(2)}</span></span>
      </div>
    </Card>
  );
};
