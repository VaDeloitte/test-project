/**
 * Safely get the userId from localStorage
 * Returns null if not found instead of a dummy value
 * Checks both direct userId and user object as fallback
 */
export function getUserId(): string | null {
  // Try direct userId first
  const userId = localStorage.getItem("userId");
  if (userId) {
    return userId;
  }

  // Fallback: Try to extract from user object
  const userDataStr = localStorage.getItem('user');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      if (userData.id) {
        // Cache it for future use
        localStorage.setItem("userId", userData.id);
        return userData.id;
      }
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }

  return null;
}

/**
 * Get userId or throw error if not found
 * Use this when userId is required for the operation
 */
export function requireUserId(): string {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("User ID not found. Please login again.");
  }
  return userId;
}

/**
 * Check if user is authenticated (has userId in localStorage)
 */
export function isUserAuthenticated(): boolean {
  return !!localStorage.getItem("userId");
}
