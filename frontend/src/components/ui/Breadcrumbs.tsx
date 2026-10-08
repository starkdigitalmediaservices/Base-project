import { Link, useMatches } from 'react-router';

import { getRouteHandle } from '@/routes/routeHandle';

/** Breadcrumb trail built from `handle.crumb` on the matched routes. */
export function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches
    .map((match) => ({ pathname: match.pathname, label: getRouteHandle(match)?.crumb }))
    .filter((crumb): crumb is { pathname: string; label: string } => Boolean(crumb.label));

  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb mb-2 small">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={crumb.pathname}
              className={isLast ? 'breadcrumb-item active' : 'breadcrumb-item'}
              aria-current={isLast ? 'page' : undefined}
            >
              {isLast ? crumb.label : <Link to={crumb.pathname}>{crumb.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
