// lib/pricing.ts

// The Haversine Formula: Calculates straight-line distance between two points on Earth
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles (use 6371 for kilometers)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

export function calculateTripPrice(
  pickupLat: number, 
  pickupLng: number, 
  dropoffLat: number, 
  dropoffLng: number,
  seatsNeeded: number = 1
): number {
  // 1. Get straight line distance
  const straightLineMiles = calculateHaversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  
  // 2. Apply Urban Road Multiplier (Roads aren't straight. 1.3x is the industry standard estimate)
  const estimatedDrivingMiles = straightLineMiles * 1.3;

  // 3. The Pricing Variables (You can tweak these!)
  const BASE_FARE = 2.00; // £2 base fee just for getting in the car
  const PER_MILE_RATE = 0.80; // 80p per mile

  // 4. Calculate Base Price
  let finalPrice = BASE_FARE + (estimatedDrivingMiles * PER_MILE_RATE);

  // 5. Add a small premium for extra seats (e.g., £2 per extra friend)
  if (seatsNeeded > 1) {
    finalPrice += (seatsNeeded - 1) * 2.00;
  }

  // 6. Round to nearest 50p for clean numbers (e.g., £8.33 becomes £8.50)
  return Math.ceil(finalPrice * 2) / 2;
}