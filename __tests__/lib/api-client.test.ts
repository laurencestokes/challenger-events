// Mock firebase-auth before importing api-client
jest.mock('../../lib/firebase-auth', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock firebase storage
jest.mock('../../lib/firebase', () => ({
  storage: {},
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

import {
  apiRequest,
  createApiClient,
  api,
  uploadTeamLogo,
  uploadEventImage,
} from '../../lib/api-client';
import { getCurrentUser } from '../../lib/firebase-auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('api-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('apiRequest', () => {
    it('throws when user is not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      await expect(apiRequest('/api/test')).rejects.toThrow('User not authenticated');
    });

    it('adds Authorization header with Bearer token', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ data: 'ok' }),
      });

      await apiRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer user123',
        },
      });
    });

    it('adds Content-Type header', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: true }),
      });

      await apiRequest('/api/test');
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('passes through additional options', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({}),
      });

      await apiRequest('/api/test', { method: 'POST', body: '{"key":"val"}' });
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        body: '{"key":"val"}',
        headers: expect.objectContaining({
          Authorization: 'Bearer user123',
        }),
      });
    });

    it('returns parsed JSON on success', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ events: [1, 2, 3] }),
      });

      const result = await apiRequest('/api/events');
      expect(result).toEqual({ events: [1, 2, 3] });
    });

    it('throws with error message from JSON error response', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'Not found' }),
      });

      await expect(apiRequest('/api/missing')).rejects.toThrow('Not found');
    });

    it('throws with error details from JSON error response', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ details: 'Validation failed' }),
      });

      await expect(apiRequest('/api/bad')).rejects.toThrow('Validation failed');
    });

    it('handles plain text error responses', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Internal Server Error',
      });

      await expect(apiRequest('/api/error')).rejects.toThrow('Internal Server Error');
    });

    it('handles empty error response', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => '',
      });

      await expect(apiRequest('/api/empty-error')).rejects.toThrow('Network error');
    });

    it('throws on invalid JSON success response', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'not json',
      });

      await expect(apiRequest('/api/bad-json')).rejects.toThrow(
        'Invalid JSON response from server',
      );
    });

    it('allows custom headers to override defaults', async () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({}),
      });

      await apiRequest('/api/test', {
        headers: { 'Content-Type': 'text/plain' },
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('text/plain');
    });
  });

  describe('createApiClient', () => {
    const mockAuthContext = (overrides = {}) => ({
      firebaseUser: { uid: 'ctx-user-456' } as any,
      loading: false,
      initialized: true,
      ...overrides,
    });

    it('throws when auth is not initialized', async () => {
      const client = createApiClient(mockAuthContext({ initialized: false }));
      await expect(client.get('/api/test')).rejects.toThrow('Authentication not initialized');
    });

    it('throws when user is not authenticated', async () => {
      const client = createApiClient(mockAuthContext({ firebaseUser: null }));
      await expect(client.get('/api/test')).rejects.toThrow('User not authenticated');
    });

    it('GET request works', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'result' }),
      });
      const client = createApiClient(mockAuthContext());
      const result = await client.get('/api/items');
      expect(result).toEqual({ data: 'result' });
      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        headers: expect.objectContaining({
          Authorization: 'Bearer ctx-user-456',
        }),
      });
    });

    it('POST request sends body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-1' }),
      });
      const client = createApiClient(mockAuthContext());
      await client.post('/api/items', { name: 'test' });
      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
    });

    it('PUT request sends body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ updated: true }),
      });
      const client = createApiClient(mockAuthContext());
      await client.put('/api/items/1', { name: 'updated' });
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
        headers: expect.any(Object),
      });
    });

    it('PATCH request sends body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ patched: true }),
      });
      const client = createApiClient(mockAuthContext());
      await client.patch('/api/items/1', { status: 'active' });
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
        headers: expect.any(Object),
      });
    });

    it('DELETE request works', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ deleted: true }),
      });
      const client = createApiClient(mockAuthContext());
      await client.delete('/api/items/1');
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE',
        headers: expect.any(Object),
      });
    });

    it('throws on error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Forbidden' }),
      });
      const client = createApiClient(mockAuthContext());
      await expect(client.get('/api/forbidden')).rejects.toThrow('Forbidden');
    });

    it('falls back to generic error on non-JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error('not json');
        },
      });
      const client = createApiClient(mockAuthContext());
      await expect(client.get('/api/crash')).rejects.toThrow('Network error');
    });
  });

  describe('api convenience object', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ok: true }),
      });
    });

    it('api.get calls apiRequest', async () => {
      await api.get('/api/test');
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });

    it('api.post sends POST with body', async () => {
      await api.post('/api/test', { key: 'val' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'val' }),
        }),
      );
    });

    it('api.put sends PUT with body', async () => {
      await api.put('/api/test/1', { name: 'updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });

    it('api.patch sends PATCH with body', async () => {
      await api.patch('/api/test/1', { status: 'done' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    it('api.delete sends DELETE', async () => {
      await api.delete('/api/test/1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  describe('uploadTeamLogo', () => {
    const mockFile = new File(['logo-data'], 'logo.png', { type: 'image/png' });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      await expect(uploadTeamLogo('t1', mockFile)).rejects.toThrow(
        'User must be authenticated to upload team logos',
      );
    });

    it('creates storage reference and starts upload', () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      (ref as jest.Mock).mockReturnValue('mock-ref');
      (uploadBytesResumable as jest.Mock).mockReturnValue({
        on: jest.fn(),
        snapshot: { ref: 'mock-snapshot-ref' },
      });

      // Fire and forget — we just verify setup, not completion
      uploadTeamLogo('t1', mockFile).catch(() => {});
      expect(ref).toHaveBeenCalledWith({}, expect.stringContaining('team-logos/'));
      expect(uploadBytesResumable).toHaveBeenCalled();
    });
  });

  describe('uploadEventImage', () => {
    const mockFile = new File(['image-data'], 'event.jpg', { type: 'image/jpeg' });

    it('throws when user is not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      await expect(uploadEventImage('e1', mockFile)).rejects.toThrow(
        'User must be authenticated to upload event images',
      );
    });

    it('creates storage reference and starts upload', () => {
      mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
      (ref as jest.Mock).mockReturnValue('mock-ref');
      (uploadBytesResumable as jest.Mock).mockReturnValue({
        on: jest.fn(),
        snapshot: { ref: 'mock-snapshot-ref' },
      });

      uploadEventImage('e1', mockFile).catch(() => {});
      expect(ref).toHaveBeenCalledWith({}, expect.stringContaining('event-images/'));
    });
  });
});
