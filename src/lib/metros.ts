// Top 50 US Metro Areas (population > 500k)
export const TOP_METROS = [
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060, population: 8336817 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, population: 3979576 },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298, population: 2693976 },
  { name: 'Houston, TX', lat: 29.7604, lng: -95.3698, population: 2320268 },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740, population: 1680992 },
  { name: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652, population: 1584064 },
  { name: 'San Antonio, TX', lat: 29.4241, lng: -98.4936, population: 1547253 },
  { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611, population: 1423851 },
  { name: 'Dallas, TX', lat: 32.7767, lng: -96.7970, population: 1343573 },
  { name: 'San Jose, CA', lat: 37.3382, lng: -121.8863, population: 1021795 },
  { name: 'Austin, TX', lat: 30.2672, lng: -97.7431, population: 978908 },
  { name: 'Jacksonville, FL', lat: 30.3322, lng: -81.6557, population: 949611 },
  { name: 'Fort Worth, TX', lat: 32.7555, lng: -97.3308, population: 918915 },
  { name: 'Columbus, OH', lat: 39.9612, lng: -82.9988, population: 905748 },
  { name: 'Charlotte, NC', lat: 35.2271, lng: -80.8431, population: 885708 },
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, population: 873965 },
  { name: 'Indianapolis, IN', lat: 39.7684, lng: -86.1581, population: 887642 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321, population: 753675 },
  { name: 'Denver, CO', lat: 39.7392, lng: -104.9903, population: 727211 },
  { name: 'Washington, DC', lat: 38.9072, lng: -77.0369, population: 705749 },
  { name: 'Boston, MA', lat: 42.3601, lng: -71.0589, population: 692600 },
  { name: 'El Paso, TX', lat: 31.7619, lng: -106.4850, population: 681728 },
  { name: 'Nashville, TN', lat: 36.1627, lng: -86.7816, population: 689447 },
  { name: 'Detroit, MI', lat: 42.3314, lng: -83.0458, population: 639111 },
  { name: 'Oklahoma City, OK', lat: 35.4676, lng: -97.5164, population: 687725 },
  { name: 'Portland, OR', lat: 45.5152, lng: -122.6784, population: 652503 },
  { name: 'Las Vegas, NV', lat: 36.1699, lng: -115.1398, population: 641903 },
  { name: 'Memphis, TN', lat: 35.1495, lng: -90.0490, population: 633104 },
  { name: 'Louisville, KY', lat: 38.2527, lng: -85.7585, population: 617638 },
  { name: 'Baltimore, MD', lat: 39.2904, lng: -76.6122, population: 585708 },
  { name: 'Milwaukee, WI', lat: 43.0389, lng: -87.9065, population: 577222 },
  { name: 'Albuquerque, NM', lat: 35.0844, lng: -106.6504, population: 564559 },
  { name: 'Tucson, AZ', lat: 32.2226, lng: -110.9747, population: 548073 },
  { name: 'Fresno, CA', lat: 36.7378, lng: -119.7871, population: 542107 },
  { name: 'Mesa, AZ', lat: 33.4152, lng: -111.8315, population: 528159 },
  { name: 'Sacramento, CA', lat: 38.5816, lng: -121.4944, population: 524943 },
  { name: 'Atlanta, GA', lat: 33.7490, lng: -84.3880, population: 498715 },
  { name: 'Kansas City, MO', lat: 39.0997, lng: -94.5786, population: 508090 },
  { name: 'Colorado Springs, CO', lat: 38.8339, lng: -104.8214, population: 498879 },
  { name: 'Raleigh, NC', lat: 35.7796, lng: -78.6382, population: 474069 },
  { name: 'Miami, FL', lat: 25.7617, lng: -80.1918, population: 442241 },
  { name: 'Long Beach, CA', lat: 33.7701, lng: -118.1937, population: 466742 },
  { name: 'Virginia Beach, VA', lat: 36.8529, lng: -75.9780, population: 459470 },
  { name: 'Omaha, NE', lat: 41.2565, lng: -95.9345, population: 486051 },
  { name: 'Oakland, CA', lat: 37.8044, lng: -122.2712, population: 440646 },
  { name: 'Minneapolis, MN', lat: 44.9778, lng: -93.2650, population: 429954 },
  { name: 'Tulsa, OK', lat: 36.1540, lng: -95.9928, population: 413066 },
  { name: 'Tampa, FL', lat: 27.9506, lng: -82.4572, population: 399700 },
  { name: 'Arlington, TX', lat: 32.7357, lng: -97.1081, population: 398121 },
  { name: 'New Orleans, LA', lat: 29.9511, lng: -90.0715, population: 389617 },
];

// Haversine distance calculation (km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within a given distance of any pre-seeded metro
 * @param lat User latitude
 * @param lng User longitude
 * @param maxDistanceKm Maximum distance to consider (default: 20km)
 * @returns Nearest metro area and distance, or null if none found
 */
export function findNearestMetro(
  lat: number,
  lng: number,
  maxDistanceKm: number = 20
): { metro: typeof TOP_METROS[0]; distance: number } | null {
  let nearestMetro: typeof TOP_METROS[0] | null = null;
  let nearestDistance = Infinity;

  for (const metro of TOP_METROS) {
    const distance = haversineDistance(lat, lng, metro.lat, metro.lng);
    if (distance < nearestDistance && distance <= maxDistanceKm) {
      nearestDistance = distance;
      nearestMetro = metro;
    }
  }

  if (nearestMetro) {
    return { metro: nearestMetro, distance: nearestDistance };
  }

  return null;
}

/**
 * Check if location is likely to have pre-seeded data
 */
export function isInSeededArea(lat: number, lng: number): boolean {
  return findNearestMetro(lat, lng) !== null;
}
