// One-line note: calculates default work mode based on day of week and French public holidays from API

import { WorkMode } from "./db/workdays";
import { formatDateLocal } from "./utils";

// Cache for public holidays by year
const holidaysCache = new Map<number, Set<string>>();

/**
 * Fetches French public holidays for a given year from the official API
 * Returns a Set of date strings in YYYY-MM-DD format
 */
async function fetchFrenchPublicHolidays(year: number): Promise<Set<string>> {
  try {
    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch holidays for year ${year}: ${response.status}`);
      return new Set<string>();
    }
    
    const data = await response.json() as Record<string, string>;
    // Keys are dates in YYYY-MM-DD format
    return new Set(Object.keys(data));
  } catch (error) {
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
 * Calculates default work mode for a given date based on:
 * - Weekends (Saturday, Sunday) -> Congé
 * - French public holidays -> Congé
 * - Wednesday, Friday -> Distanciel
 * - Monday, Tuesday, Thursday -> Présentiel
 */
export async function getDefaultWorkMode(date: Date | string): Promise<WorkMode> {
  const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Weekends are always Congé
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'Congé';
  }

  // French public holidays are Congé
  if (await isFrenchPublicHoliday(dateObj)) {
    return 'Congé';
  }

  // Wednesday (3) and Friday (5) are Distanciel
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    return 'Distanciel';
  }

  // Monday (1), Tuesday (2), Thursday (4) are Présentiel
  return 'Présentiel';
}

