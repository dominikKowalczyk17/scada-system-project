/* eslint-disable react-refresh/only-export-components */
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

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
 * Internal helper component.
 */
interface AllTheProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRoutes?: string[];
}

function AllTheProviders({
  children,
  queryClient = createTestQueryClient(),
  initialRoutes = ['/'],
}: AllTheProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialRoutes}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
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