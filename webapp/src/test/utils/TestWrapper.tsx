import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createTestQueryClient } from "./test-utils";
import { MemoryRouter } from "react-router-dom";

/**
 * Internal helper component.
 */
interface AllTheProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRoutes?: string[];
}

export function AllTheProviders({
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