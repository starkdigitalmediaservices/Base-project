import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ErrorState } from '@/components/ui/StateMessage';

/** Last-resort error boundary for render errors and failed lazy chunks. */
export function RouteErrorPage() {
  const error = useRouteError();
  const description = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'An unexpected error occurred while displaying this page.';

  return (
    <div className="container py-5">
      <ErrorState
        title="This page failed to load"
        description={description}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
