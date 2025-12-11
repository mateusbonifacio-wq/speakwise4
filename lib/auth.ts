/**
 * Authentication utilities for PIN-based access
 * Restaurant tenant system using localStorage
 */

export const RESTAURANT_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"] as const;
export type RestaurantId = typeof RESTAURANT_IDS[number];

const STORAGE_KEYS = {
  authenticated: "clearstock_authenticated",
  restaurantId: "clearstock_restaurantId",
  session: "clearstock_session",
} as const;

/**
 * PIN to RestaurantId mapping (6-digit PINs)
 * Old 4-digit PINs are padded with leading zeros
 */
export const PIN_TO_RESTAURANT: Record<string, RestaurantId> = {
  "001111": "A", // was "1111"
  "002222": "B", // was "2222"
  "003333": "C", // was "3333"
  "004921": "D", // was "4921"
  "005421": "E", // was "5421"
  "006531": "F", // was "6531"
  "007641": "G", // was "7641"
  "008751": "H", // was "8751"
  "009861": "I", // was "9861"
  "001357": "J", // was "1357"
  "002468": "K", // was "2468"
  "003579": "L", // was "3579"
  "004681": "M", // was "4681"
  "005792": "N", // was "5792"
  "006813": "O", // was "6813"
  "007924": "P", // was "7924"
  "008135": "Q", // was "8135"
};

/**
 * Helper to normalize PIN (pad 4-digit PINs to 6 digits for backward compatibility)
 */
export function normalizePIN(pin: string): string {
  const trimmed = pin.trim();
  // If it's 4 digits, pad with leading zeros
  if (trimmed.length === 4 && /^\d{4}$/.test(trimmed)) {
    return `00${trimmed}`;
  }
  return trimmed;
}

/**
 * RestaurantId to display name mapping
 */
export const RESTAURANT_NAMES: Record<RestaurantId, string> = {
  A: "Restaurante A",
  B: "Restaurante B",
  C: "Restaurante C",
  D: "Restaurante D",
  E: "Restaurante E",
  F: "Restaurante F",
  G: "Restaurante G",
  H: "Restaurante H",
  I: "Restaurante I",
  J: "Restaurante J",
  K: "Restaurante K",
  L: "Restaurante L",
  M: "Restaurante M",
  N: "Restaurante N",
  O: "Restaurante O",
  P: "Restaurante P",
  Q: "Restaurante Q",
};

const isRestaurantId = (value: string | null): value is RestaurantId => {
  if (!value) return false;
  return RESTAURANT_IDS.includes(value as RestaurantId);
};

/**
 * Check if user is authenticated
 * Now also checks for valid session (7-day persistence)
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  
  // First check for valid session
  if (hasValidSession()) {
    return true;
  }
  
  // Fallback to old auth check for backward compatibility
  const authenticated = localStorage.getItem(STORAGE_KEYS.authenticated);
  const restaurantId = localStorage.getItem(STORAGE_KEYS.restaurantId);
  
  return authenticated === "true" && isRestaurantId(restaurantId);
}

/**
 * Get current restaurant ID from localStorage
 */
export function getRestaurantId(): RestaurantId | null {
  if (typeof window === "undefined") return null;
  
  const restaurantId = localStorage.getItem(STORAGE_KEYS.restaurantId);
  
  if (isRestaurantId(restaurantId)) {
    return restaurantId;
  }
  
  return null;
}

/**
 * Session data structure
 */
export interface SessionData {
  pin: string;
  restaurantId: RestaurantId;
  expiresAt: number; // timestamp
}

/**
 * Set authentication and restaurant ID with 7-day session
 */
export function setAuth(restaurantId: RestaurantId, pin: string): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(STORAGE_KEYS.authenticated, "true");
  localStorage.setItem(STORAGE_KEYS.restaurantId, restaurantId);
  
  // Create session that expires in 7 days
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const session: SessionData = {
    pin,
    restaurantId,
    expiresAt,
  };
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

/**
 * Clear authentication and session
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem(STORAGE_KEYS.authenticated);
  localStorage.removeItem(STORAGE_KEYS.restaurantId);
  localStorage.removeItem(STORAGE_KEYS.session);
}

/**
 * Get current session if valid
 */
export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.session);
    if (!sessionStr) return null;
    
    const session: SessionData = JSON.parse(sessionStr);
    
    // Check if session is still valid
    if (session.expiresAt > Date.now()) {
      return session;
    }
    
    // Session expired, clear it
    clearAuth();
    return null;
  } catch (error) {
    console.error("Error parsing session:", error);
    clearAuth();
    return null;
  }
}

/**
 * Check if user has a valid session
 */
export function hasValidSession(): boolean {
  return getSession() !== null;
}

/**
 * Validate PIN and return restaurant ID if valid
 * PIN must be exactly 6 digits
 */
export function validatePIN(pin: string): RestaurantId | null {
  const trimmedPin = pin.trim();
  
  // Must be exactly 6 digits
  if (!/^\d{6}$/.test(trimmedPin)) {
    return null;
  }
  
  // Try direct lookup
  let restaurantId = PIN_TO_RESTAURANT[trimmedPin];
  
  // If not found, try normalizing (for backward compatibility with 4-digit PINs)
  if (!restaurantId) {
    const normalized = normalizePIN(trimmedPin);
    restaurantId = PIN_TO_RESTAURANT[normalized];
  }
  
  return restaurantId || null;
}

