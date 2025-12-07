// One-line note: calculates default work mode based on day of week and French public holidays from API

import { WorkMode } from "@/lib/db/workdays";
import { formatDateLocal } from "@/lib/utils";

// Cache for public holidays by year
const holidaysCache = new Map<number, Set<string>>();

/**
 * Fetches French public holidays for a given year from the official API
 * Returns a Set of date strings in YYYY-MM-DD format
 */
async function fetchFrenchPublicHolidays(year: number): Promise<Set<string>> {
  try {
    // Use fetch without Next.js cache options in server context to avoid issues
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`,
      { 
        cache: 'force-cache',
        next: { revalidate: 86400 } // Cache for 24 hours (only works in certain Next.js contexts)
      }
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch holidays for year ${year}: ${response.status} ${response.statusText}`);
      return new Set<string>();
    }
    
    const data = await response.json() as Record<string, string>;
    // Keys are dates in YYYY-MM-DD format
    return new Set(Object.keys(data));
  } catch (error) {
    // Log error but return empty set to allow fallback to weekday logic
    console.error(`Error fetching holidays for year ${year}:`, error);
    return new Set<string>();
  }
}

/**
 * Gets French public holidays for a given year (uses cache)
 */
async function getFrenchPublicHolidays(year: number): Promise<Set<string>> {
  if (holidaysCache.has(year)) {
    return holidaysCache.get(year)!;
  }
  
  const holidays = await fetchFrenchPublicHolidays(year);
  holidaysCache.set(year, holidays);
  return holidays;
}

/**
 * Checks if a date is a French public holiday
 */
async function isFrenchPublicHoliday(date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const dateStr = formatDateLocal(date); // YYYY-MM-DD format
  const holidays = await getFrenchPublicHolidays(year);
  return holidays.has(dateStr);
}

/**
 * Day of week (0=Sunday, 1=Monday, ..., 6=Saturday) via Zeller's congruence (Gregorian).
 * month: 1..12, day: 1..31
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  let m = month;
  let y = year;
  if (m < 3) { m += 12; y -= 1; }

  const k = y % 100;         // year of century
  const j = Math.floor(y / 100); // zero-based century

  // Zeller: h = 0..6 with 0=Saturday
  const hRaw =
    day +
    Math.floor((13 * (m + 1)) / 5) +
    k +
    Math.floor(k / 4) +
    Math.floor(j / 4) -
    2 * j;

  // Normalise modulo 7 pour éviter les négatifs
  const h = ((hRaw % 7) + 7) % 7;

  // Convertir 0=Saturday -> 0=Sunday
  return (h + 6) % 7;
}

/**
 * Calculates default work mode for a given date based on:
 * - Weekends (Saturday, Sunday) -> Congé
 * - French public holidays -> Congé
 * - Wednesday, Friday -> Distanciel
 * - Monday, Tuesday, Thursday -> Présentiel
 */
export async function getDefaultWorkMode(date: Date | string): Promise<WorkMode> {
  // Parse date string to ensure consistent date object
  const dateStr = typeof date === 'string' ? date : formatDateLocal(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Calculate day of week using timezone-independent formula
  const dayOfWeek = getDayOfWeek(year, month, day);

  // Weekends are always Congé
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'Congé';
  }

  // Create date object for holiday check (needed for formatDateLocal)
  const dateObj = new Date(year, month - 1, day);

  // French public holidays are Congé
  try {
    if (await isFrenchPublicHoliday(dateObj)) {
      return 'Congé';
    }
  } catch (error) {
    // If holiday check fails, log but continue with weekday logic
    console.error(`Error checking holiday for ${dateStr}:`, error);
  }

  // Wednesday (3) and Friday (5) are Distanciel
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    return 'Distanciel';
  }

  // Monday (1), Tuesday (2), Thursday (4) are Présentiel
  return 'Présentiel';
}

