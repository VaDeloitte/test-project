/**
 * Helper function to track user login in database
 * Called after successful Azure AD authentication
 */
export async function trackUserLogin(user: {
  username?: string;
  email: string;
  azureAdId: string;
  serviceLine?: string | string[];
  country?: string;
  department?: string;
  officeLocation?: string;
  isAdmin?: boolean;
}): Promise<void> {
  try {
    const serviceLineArray = Array.isArray(user.serviceLine) 
      ? user.serviceLine 
      : user.serviceLine 
        ? [user.serviceLine] 
        : [];

    const roles = user.isAdmin ? ['user', 'admin'] : ['user'];

    const response = await fetch('/api/secure-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username || user.email.split('@')[0],
        email: user.email,
        azureAdId: user.azureAdId,
        serviceLine: serviceLineArray,
        country: user.country,
        department: user.department,
        officeLocation: user.officeLocation,
        roles: roles,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to track user login:', error);
    } else {
      const result = await response.json();
      console.log('✅ User login tracked in database:', result.message);
    }
  } catch (error) {
    console.error('Error tracking user login:', error);
    // Don't throw - we don't want login tracking to block the user
  }
}
