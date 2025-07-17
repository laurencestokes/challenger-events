import { getCurrentUser } from './firebase-auth';
import { User as FirebaseUser } from 'firebase/auth';

// Helper function to wait for auth to be ready
async function waitForAuth(maxWait = 3000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const user = getCurrentUser();
    if (user) {
      return true;
    }
    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  // Wait for auth to be ready before making the request
  const isAuthenticated = await waitForAuth();

  if (!isAuthenticated) {
    throw new Error('User not authenticated');
  }

  const user = getCurrentUser();
  const userId = user!.uid;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    console.error('API Error Response:', error);
    throw new Error(error.error || error.details || 'Request failed');
  }

  return response.json();
}

// Alternative API client that uses auth context (for components that have access to it)
export function createApiClient(authContext: {
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
}) {
  const apiClient = {
    async request(url: string, options: RequestInit = {}) {
      // Wait for auth to be initialized
      if (!authContext.initialized) {
        throw new Error('Authentication not initialized');
      }

      if (!authContext.firebaseUser) {
        throw new Error('User not authenticated');
      }

      const userId = authContext.firebaseUser.uid;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    },

    get: function (url: string) {
      return this.request(url);
    },
    post: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    put: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    patch: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: function (url: string) {
      return this.request(url, {
        method: 'DELETE',
      });
    },
  };

  return apiClient;
}

export const api = {
  get: (url: string) => apiRequest(url),
  post: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patch: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (url: string) =>
    apiRequest(url, {
      method: 'DELETE',
    }),
};
