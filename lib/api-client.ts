import { getCurrentUser } from './firebase-auth';

export async function apiRequest(url: string, options: RequestInit = {}) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const userId = user.uid;

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
  delete: (url: string) =>
    apiRequest(url, {
      method: 'DELETE',
    }),
};
