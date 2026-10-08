import { Link } from 'react-router';

import { EmptyState } from '@/components/ui/StateMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROUTES } from '@/routes/paths';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="visually-hidden">
        Page not found
      </h1>
      <EmptyState
        icon="exclamation-triangle"
        title="404 — Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link to={ROUTES.root} className="btn btn-primary">
            Go to the dashboard
          </Link>
        }
      />
    </section>
  );
}
