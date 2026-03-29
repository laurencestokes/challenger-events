import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock providers to avoid Firebase initialization
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Providers } from '../../components/Providers';

describe('Providers', () => {
  it('renders children', () => {
    render(
      <Providers>
        <div>App Content</div>
      </Providers>,
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('wraps children in all providers', () => {
    const { container } = render(
      <Providers>
        <p>Nested</p>
      </Providers>,
    );
    expect(container.querySelector('p')).toBeInTheDocument();
  });
});
