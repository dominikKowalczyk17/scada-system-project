import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Dashboard from './views/Dashboard';
import History from './views/History';
import { LayoutDashboard, History as HistoryIcon } from 'lucide-react';

function Navigation() {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'History', icon: HistoryIcon },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3 sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm sm:text-base">S</span>
            </div>
            <span className="text-base sm:text-xl font-bold">SCADA Monitor</span>
          </div>

          <div className="flex gap-1">
            {links.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors ${
                  location.pathname === path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
