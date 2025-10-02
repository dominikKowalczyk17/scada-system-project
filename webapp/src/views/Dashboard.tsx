import { ParameterCard } from "@/components/ParameterCard";
import { GridSection } from "@/components/GridSection";
import { AlertPanel } from "@/components/AlertPanel";
import { LiveChart } from "@/components/LiveChart";
import { Activity, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">SCADA Grid Monitor</h1>
                <p className="text-sm text-muted-foreground">Electrical Distribution Network</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-success animate-pulse" />
                <span className="text-sm text-muted-foreground">System Online</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-foreground">{time.toLocaleTimeString()}</div>
                <div className="text-xs text-muted-foreground">{time.toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Real-time Parameters */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Real-time Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ParameterCard
              title="Voltage L1-N"
              value="232.4"
              unit="kV"
              status="normal"
              min="230.0"
              max="240.0"
              trend="up"
            />
            <ParameterCard
              title="Current L1"
              value="845.2"
              unit="A"
              status="warning"
              min="800.0"
              max="900.0"
              trend="stable"
            />
            <ParameterCard
              title="Active Power"
              value="12.8"
              unit="MW"
              status="normal"
              min="10.0"
              max="15.0"
              trend="up"
            />
            <ParameterCard
              title="Frequency"
              value="50.02"
              unit="Hz"
              status="normal"
              min="49.90"
              max="50.10"
              trend="stable"
            />
          </div>
        </section>

        {/* Chart Section */}
        <section className="mb-8">
          <LiveChart />
        </section>

        {/* Grid Sections and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full" />
              Grid Sections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GridSection name="Sector A" status="normal" load={142.5} capacity={200} />
              <GridSection name="Sector B" status="warning" load={178.3} capacity={200} />
              <GridSection name="Sector C" status="normal" load={95.8} capacity={150} />
              <GridSection name="Sector D" status="critical" load={188.2} capacity={200} />
            </div>
          </div>

          <div>
            <AlertPanel />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
