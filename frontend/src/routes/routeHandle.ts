import type { UIMatch } from 'react-router';

/** Metadata attached to route objects via `handle`; read by Breadcrumbs. */
export interface RouteHandle {
  /** Breadcrumb label for this route. */
  crumb?: string;
}

export function getRouteHandle(match: UIMatch): RouteHandle | undefined {
  const handle = match.handle as RouteHandle | undefined;
  return handle && typeof handle === 'object' ? handle : undefined;
}
