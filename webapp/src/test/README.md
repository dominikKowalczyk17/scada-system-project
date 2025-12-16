# Test Directory Structure

This directory contains all unit and integration tests for the SCADA webapp frontend.

## Directory Organization

```
src/test/
├── components/     # Tests for complex React components
│   └── StreamingChart.test.tsx
├── ui/             # Tests for simple UI components (buttons, cards, etc.)
│   └── Button.test.tsx
├── hooks/          # Tests for custom React hooks (to be added)
├── views/          # Tests for page-level components (to be added)
└── lib/            # Tests for utility functions (to be added)
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- StreamingChart

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Coverage Requirements

- **Complex components** (e.g., StreamingChart): Minimum 90% coverage
- **UI components** (e.g., Button, Card): Minimum 80% coverage
- **Utility functions**: Minimum 95% coverage
- **Hooks**: Minimum 90% coverage

## Writing Tests

### Component Tests

Component tests should cover:
- Rendering with various props
- User interactions (clicks, inputs, etc.)
- Edge cases and error handling
- Accessibility requirements

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Hook Tests

Use `@testing-library/react-hooks` for testing custom hooks:
```typescript
import { renderHook } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```

### Utility Tests

Utility function tests should cover:
- Normal operation
- Edge cases (empty input, null, undefined)
- Boundary conditions
- Error handling

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { myUtilFunction } from '@/lib/utils';

describe('myUtilFunction', () => {
  it('handles normal input', () => {
    expect(myUtilFunction('test')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(myUtilFunction('')).toBe('default');
    expect(myUtilFunction(null)).toBe('default');
  });
});
```

## Best Practices

1. **One test file per source file**: `StreamingChart.tsx` → `StreamingChart.test.tsx`
2. **Use descriptive test names**: `it('handles circular buffer overflow correctly')`
3. **Group related tests**: Use `describe` blocks to organize tests
4. **Mock external dependencies**: Use `vi.mock()` for external libraries (e.g., Recharts, axios)
5. **Test user behavior, not implementation**: Focus on what the user sees and does
6. **Keep tests isolated**: Each test should be independent
7. **Use beforeEach for setup**: Clean up state between tests
8. **Test edge cases**: null, undefined, empty arrays, extreme values

## Mocking Strategies

### Mock Recharts
```typescript
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
}));
```

### Mock WebSocket
```typescript
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    data: mockData,
  }),
}));
```

### Mock API Calls
```typescript
vi.mock('@/lib/api', () => ({
  fetchDashboardData: vi.fn(() => Promise.resolve(mockData)),
}));
```

## Current Test Coverage

- **StreamingChart**: 99.23% statements, 90% branches, 66.66% functions ✅
- **Button**: Basic coverage ⚠️ (needs expansion)

## Todo

- [ ] Add tests for all components
- [ ] Add tests for custom hooks (useWebSocket, useDashboardData, etc.)
- [ ] Add tests for utility functions
- [ ] Add tests for views (Dashboard, History)
- [ ] Set up integration tests
- [ ] Set up E2E tests (Playwright/Cypress)
