/** Shapes shared by every FastAPI endpoint. Keep in sync with backend/app/schemas. */

export interface ApiErrorDetail {
  /** Field path without the leading "body"/"query"/"path" segment, e.g. "email". */
  field: string | null;
  loc: (string | number)[];
  message: string;
  type: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[] | null;
    request_id: string | null;
  };
}

/** Backend pagination envelope. Pagination is always performed by the backend. */
export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export type SortOrder = 'asc' | 'desc';

export interface PageParams {
  page: number;
  page_size: number;
}

export interface SortParams<TSortKey extends string = string> {
  sort_by?: TSortKey;
  sort_order?: SortOrder;
}
