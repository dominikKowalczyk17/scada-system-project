import { Card } from "@/ui/Card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  location: string;
}

const alerts: Alert[] = [
  { id: "1", type: "warning", message: "High load detected in Sector B", timestamp: "2 min ago", location: "Sector B" },
  { id: "2", type: "info", message: "Maintenance scheduled for 22:00", timestamp: "15 min ago", location: "Sector A" },
  { id: "3", type: "critical", message: "Voltage spike detected", timestamp: "45 min ago", location: "Sector D" },
];

export const AlertPanel = () => {
  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "info":
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getBorderColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "border-l-destructive";
      case "warning":
        return "border-l-warning";
      case "info":
        return "border-l-primary";
    }
  };

  return (
    <Card className="bg-card border-border shadow-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">System Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border-l-4 transition-all hover:bg-secondary",
              getBorderColor(alert.type)
            )}
          >
            {getIcon(alert.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.message}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{alert.location}</span>
                <span>•</span>
                <span>{alert.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
