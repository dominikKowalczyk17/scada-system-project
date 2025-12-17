import { type ReactElement } from 'react';
import { render, type RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { AllTheProviders } from './TestWrapper';

/**
 * Create a new QueryClient for each test to ensure isolation.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that wraps UI with providers.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoutes?: string[];
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions,
) {
  const { queryClient, initialRoutes, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient} initialRoutes={initialRoutes}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
}

export { screen, fireEvent, waitFor };

export { customRender as render };