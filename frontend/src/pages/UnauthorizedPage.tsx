import { Link, type Location, useLocation } from 'react-router';

import { EmptyState } from '@/components/ui/StateMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROUTES } from '@/routes/paths';

export function UnauthorizedPage() {
  useDocumentTitle('Access denied');
  const from = (useLocation().state as { from?: Location } | null)?.from;
  return (
    <section aria-labelledby="unauthorized-title">
      <h1 id="unauthorized-title" className="visually-hidden">
        Access denied
      </h1>
      <EmptyState
        icon="shield-lock"
        title="403 — You don't have access to this page"
        description={
          <>
            {from ? (
              <>
                Your role does not grant access to <code>{from.pathname}</code>.{' '}
              </>
            ) : null}
            Ask an administrator if you believe you should have access.
          </>
        }
        action={
          <Link to={ROUTES.dashboard} className="btn btn-primary">
            Back to the dashboard
          </Link>
        }
      />
    </section>
  );
}
