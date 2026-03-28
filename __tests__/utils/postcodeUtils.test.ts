import {
  getPostcodeCoordinates,
  getDistanceBetweenPostcodes,
  isEventWithinDistance,
} from '../../utils/postcodeUtils';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Known coordinates for testing Haversine:
// London (SW1A 1AA): 51.5014, -0.1419
// Manchester (M1 1AE): 53.4808, -2.2426
// Distance ~163 miles
const londonCoords = { lat: 51.5014, lng: -0.1419 };
const manchesterCoords = { lat: 53.4808, lng: -2.2426 };

function mockPostcodeResponse(coords: { lat: number; lng: number } | null, ok = true) {
  if (!ok || !coords) {
    return {
      ok: false,
      json: async () => ({ status: 404 }),
    };
  }
  return {
    ok: true,
    json: async () => ({
      status: 200,
      result: { latitude: coords.lat, longitude: coords.lng },
    }),
  };
}

describe('postcodeUtils', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Clear the internal cache between tests by re-importing won't work,
    // so we test caching behavior explicitly
  });

  describe('getPostcodeCoordinates', () => {
    it('returns null for empty postcode', async () => {
      expect(await getPostcodeCoordinates('')).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('normalizes postcode (removes spaces, uppercases)', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(londonCoords));
      await getPostcodeCoordinates('sw1a 1aa');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('SW1A1AA'));
    });

    it('returns coordinates for valid postcode', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(londonCoords));
      const result = await getPostcodeCoordinates('UNIQUE1');
      expect(result).toEqual(londonCoords);
    });

    it('falls back to outward code when exact lookup fails', async () => {
      mockFetch
        .mockResolvedValueOnce(mockPostcodeResponse(null, false)) // exact fails
        .mockResolvedValueOnce(mockPostcodeResponse(manchesterCoords)); // outcode succeeds
      const result = await getPostcodeCoordinates('M1OUTCODE');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(manchesterCoords);
    });

    it('returns null and caches when both lookups fail', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(null, false));
      const result = await getPostcodeCoordinates('ZZZFAIL');
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await getPostcodeCoordinates('NETERR');
      expect(result).toBeNull();
    });

    it('caches results to avoid repeated API calls', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(londonCoords));
      await getPostcodeCoordinates('CACHED1');
      await getPostcodeCoordinates('CACHED1');
      // Only 1 fetch call — second call hits cache
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('caches null results too', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(null, false));
      await getPostcodeCoordinates('NULLCACHE');
      mockFetch.mockReset();
      const result = await getPostcodeCoordinates('NULLCACHE');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getDistanceBetweenPostcodes', () => {
    it('returns null when first postcode lookup fails', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(null, false));
      const result = await getDistanceBetweenPostcodes('FAIL1', 'FAIL2');
      expect(result).toBeNull();
    });

    it('calculates distance in miles between two postcodes', async () => {
      // Use unique postcodes so cache doesn't interfere
      mockFetch
        .mockResolvedValueOnce(mockPostcodeResponse(londonCoords))
        .mockResolvedValueOnce(mockPostcodeResponse(manchesterCoords));
      const distance = await getDistanceBetweenPostcodes('DIST1A', 'DIST1B', 'miles');
      expect(distance).not.toBeNull();
      // London to Manchester is ~163 miles
      expect(distance!).toBeGreaterThan(150);
      expect(distance!).toBeLessThan(180);
    });

    it('calculates distance in km', async () => {
      mockFetch
        .mockResolvedValueOnce(mockPostcodeResponse(londonCoords))
        .mockResolvedValueOnce(mockPostcodeResponse(manchesterCoords));
      const distance = await getDistanceBetweenPostcodes('DIST2A', 'DIST2B', 'km');
      expect(distance).not.toBeNull();
      // ~262 km
      expect(distance!).toBeGreaterThan(240);
      expect(distance!).toBeLessThan(280);
    });

    it('returns 0 for same location', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(londonCoords));
      const distance = await getDistanceBetweenPostcodes('SAME1', 'SAME2', 'miles');
      expect(distance).toBeCloseTo(0, 5);
    });
  });

  describe('isEventWithinDistance', () => {
    it('returns true when within distance', async () => {
      mockFetch
        .mockResolvedValueOnce(mockPostcodeResponse(londonCoords))
        .mockResolvedValueOnce(mockPostcodeResponse({ lat: 51.52, lng: -0.08 })); // ~3 miles away
      const result = await isEventWithinDistance('NEAR1', 'NEAR2', 10, 'miles');
      expect(result).toBe(true);
    });

    it('returns false when beyond distance', async () => {
      mockFetch
        .mockResolvedValueOnce(mockPostcodeResponse(londonCoords))
        .mockResolvedValueOnce(mockPostcodeResponse(manchesterCoords));
      const result = await isEventWithinDistance('FAR1', 'FAR2', 10, 'miles');
      expect(result).toBe(false);
    });

    it('falls back to string matching when lookup fails', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(null, false));
      // "SW1A" is a substring of "SW1A 1AA"
      const result = await isEventWithinDistance('SW1A 1AA', 'SW1A', 10);
      expect(result).toBe(true);
    });

    it('string fallback returns false for non-matching postcodes', async () => {
      mockFetch.mockResolvedValue(mockPostcodeResponse(null, false));
      const result = await isEventWithinDistance('STRNONE1', 'STRNONE2', 10);
      expect(result).toBe(false);
    });
  });
});
