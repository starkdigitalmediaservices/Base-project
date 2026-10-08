import type { PageParams, SortParams } from './api';
import type { RoleSummary } from './role';

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role: RoleSummary;
  created_at: string;
  updated_at: string;
}

export type UserSortKey = 'created_at' | 'name' | 'email';

export interface UserListParams extends PageParams, SortParams<UserSortKey> {
  search?: string;
  role_id?: number;
  is_active?: boolean;
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role_id: number;
  is_active?: boolean;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  role_id?: number;
  is_active?: boolean;
}
