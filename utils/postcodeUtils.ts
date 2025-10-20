// Postcodes.io API integration for UK postcode lookup
// Documentation: https://postcodes.io/docs/overview/

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'miles' | 'km' = 'miles',
): number {
  const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in miles or km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Cache for postcode coordinates to avoid repeated API calls
const postcodeCache = new Map<string, { lat: number; lng: number } | null>();

// Get coordinates for a UK postcode using Postcodes.io API
export async function getPostcodeCoordinates(
  postcode: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!postcode) return null;

  // Normalize postcode (remove spaces, convert to uppercase)
  const normalizedPostcode = postcode.replace(/\s/g, '').toUpperCase();

  // Check cache first
  if (postcodeCache.has(normalizedPostcode)) {
    return postcodeCache.get(normalizedPostcode)!;
  }

  try {
    // Try exact postcode lookup first
    let response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalizedPostcode)}`,
    );

    if (!response.ok) {
      // If exact lookup fails, try outward code lookup (e.g., SW1A instead of SW1A 1AA)
      const outwardCode = normalizedPostcode.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/)?.[1];
      if (outwardCode) {
        response = await fetch(
          `https://api.postcodes.io/outcodes/${encodeURIComponent(outwardCode)}`,
        );
      }
    }

    if (response.ok) {
      const data = await response.json();
      if (data.status === 200 && data.result) {
        const coordinates = {
          lat: data.result.latitude,
          lng: data.result.longitude,
        };

        // Cache the result
        postcodeCache.set(normalizedPostcode, coordinates);
        return coordinates;
      }
    }

    // Cache null result to avoid repeated failed requests
    postcodeCache.set(normalizedPostcode, null);
    return null;
  } catch (error) {
    console.warn(`Failed to lookup postcode ${normalizedPostcode}:`, error);
    // Cache null result
    postcodeCache.set(normalizedPostcode, null);
    return null;
  }
}

// Calculate distance between two postcodes
export async function getDistanceBetweenPostcodes(
  postcode1: string,
  postcode2: string,
  unit: 'miles' | 'km' = 'miles',
): Promise<number | null> {
  const coords1 = await getPostcodeCoordinates(postcode1);
  const coords2 = await getPostcodeCoordinates(postcode2);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng, unit);
}

// Check if an event is within the specified distance of a postcode
export async function isEventWithinDistance(
  eventPostcode: string,
  userPostcode: string,
  maxDistance: number,
  unit: 'miles' | 'km' = 'miles',
): Promise<boolean> {
  const distance = await getDistanceBetweenPostcodes(eventPostcode, userPostcode, unit);

  if (distance === null) {
    // If we can't calculate distance, fall back to simple string matching
    return (
      eventPostcode.toLowerCase().includes(userPostcode.toLowerCase()) ||
      userPostcode.toLowerCase().includes(eventPostcode.toLowerCase())
    );
  }

  return distance <= maxDistance;
}
