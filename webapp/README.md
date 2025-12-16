# SCADA Energy Monitor - Frontend

React + TypeScript + Vite dashboard for monitoring electrical power quality in home installations.

## Tech Stack

- **React 18.3** with TypeScript
- **Vite** - Fast build tool with HMR
- **shadcn/ui** - Accessible component library (Radix UI primitives)
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client for REST API
- **Recharts** - Data visualization library
- **TailwindCSS** - Utility-first CSS framework
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing

## Development Setup

### Prerequisites
- Node.js 20.19.0+ or 22.12.0+
- Backend running on `http://localhost:8080` (see `../scada-system`)

### Installation

```bash
cd webapp
npm install
```

### Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

Production build output: `dist/`

## Project Structure

```
webapp/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── ParameterCard.tsx
│   │   ├── PowerQualityChart.tsx
│   │   └── ConnectionStatus.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useDashboardData.ts
│   │   ├── useWebSocket.ts
│   │   └── useLatestMeasurement.ts
│   ├── lib/              # Utilities
│   │   ├── api.ts        # Axios instance
│   │   ├── queryClient.ts # React Query config
│   │   └── utils.ts
│   ├── pages/            # Page components
│   │   └── Dashboard.tsx
│   ├── types/            # TypeScript types
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
└── package.json
```

## Backend Connection

### REST API Endpoints

Base URL: `http://localhost:8080`

- `GET /api/dashboard` - Complete dashboard data (measurements + statistics)
- `GET /api/measurements/latest` - Latest single measurement
- `GET /api/measurements/history?from=X&to=Y&limit=100` - Historical data
- `GET /api/stats/daily` - Daily statistics
- `GET /api/stats/last-7-days` - Weekly statistics

### WebSocket Real-time Updates

```typescript
// Connection
const ws = new WebSocket('ws://localhost:8080/ws/measurements');

// Subscribe to dashboard topic
ws.send(JSON.stringify({
  type: 'subscribe',
  topic: '/topic/dashboard'
}));

// Receive real-time data (every 3 seconds)
ws.onmessage = (event) => {
  const data: RealtimeDashboardDTO = JSON.parse(event.data);
  // Update dashboard components
};
```

**Message Format:**
```json
{
  "measurement": {
    "voltage": 230.5,
    "current": 5.2,
    "powerActive": 1150.3,
    "cosPhi": 0.98,
    "frequency": 50.02,
    "harmonicsV": [230.5, 3.2, 1.5, ...],
    "harmonicsI": [5.2, 0.08, 0.04, ...]
  },
  "waveforms": {
    "voltage": [325.27, 324.89, ...],  // 200 points
    "current": [7.35, 7.33, ...]       // 200 points
  },
  "timestamp": "2025-11-15T19:45:30"
}
```

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# TypeScript type checking
npm run type-check
```

## Testing

### Unit Tests (Vitest)

```bash
npm test
```

### Component Tests (React Testing Library)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Implementation Status

**Completed (✅):**
- Basic project structure
- shadcn/ui components setup
- Dashboard layout mockup
- Vitest testing framework

**In Progress (Issue #42):**
- TanStack Query integration
- Backend API connection
- WebSocket real-time updates
- Recharts data visualization
- Loading states & error handling

**To Do:**
- Waveform chart (voltage/current sinusoid visualization)
- Harmonics bar chart
- Historical data view with date picker
- Statistics dashboard
- Settings & configuration page

## Troubleshooting

### Backend Connection Issues

**Problem:** `Failed to fetch from http://localhost:8080`

**Solution:**
1. Verify backend is running: `curl http://localhost:8080/health`
2. Check CORS configuration in `WebSocketConfig.java`
3. Ensure Docker services are up: `docker-compose up -d`

### WebSocket Connection Fails

**Problem:** WebSocket connection refused

**Solution:**
1. Verify WebSocket endpoint: `ws://localhost:8080/ws/measurements`
2. Check backend logs for WebSocket errors
3. Ensure MQTT broker (Mosquitto) is running
4. Test with browser DevTools → Network → WS tab

### Build Errors

**Problem:** TypeScript errors during build

**Solution:**
```bash
npm run type-check
npm run lint
```

## Related Documentation

- [Backend Implementation](../BACKEND-IMPLEMENTATION.md) - Backend API details
- [Development Setup](../DEV-SETUP.md) - Full development environment setup
- [CI/CD Setup](../CI-CD-SETUP.md) - Deployment pipeline
- [Project Docs](../CLAUDE.md) - Complete project documentation

## Contributing

See issue tracker: https://github.com/dominikKowalczyk17/scada-system-project/issues

Currently working on: **Issue #42 - Frontend Dashboard API Integration**

---

🤖 Bachelor's thesis project - Electrical Power Quality Monitoring System
