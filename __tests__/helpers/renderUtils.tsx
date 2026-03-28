import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';

// Create a fresh QueryClient for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// Wrapper that provides QueryClientProvider
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Custom render with QueryClientProvider
export function renderWithQuery(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}
