import type { User } from './user';

/** The authenticated user, including the permissions granted by their role. */
export interface CurrentUser extends User {
  permissions: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  /** Access-token lifetime in seconds. */
  expires_in: number;
  user: CurrentUser;
}

export interface UpdateProfileInput {
  name: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}
