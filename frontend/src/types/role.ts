import type { PageParams, SortParams } from './api';

export interface RoleSummary {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export type RoleSortKey = 'name' | 'created_at';

export interface RoleListParams extends PageParams, SortParams<RoleSortKey> {
  search?: string;
}

export interface RoleCreateInput {
  name: string;
  description?: string | null;
}

export type RoleUpdateInput = Partial<RoleCreateInput>;
