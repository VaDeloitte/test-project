export default interface User {
  loggedIn: boolean;
  username?: string;
  email?: string;
  isAdmin?: boolean;
  accountId?: string;
  idToken?: string;
  id?: string; // Azure AD homeAccountId
  country?: string;
  serviceLine?: string;
  department?: string;
  officeLocation?: string;
  roles?: string[];
  status?: 'active' | 'inactive';
  lastLoginAt?: Date;
}
