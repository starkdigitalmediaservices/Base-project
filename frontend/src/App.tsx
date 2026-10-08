import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';

import { ToastProvider } from '@/components/feedback/ToastProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createAppRouter } from '@/routes/router';
import { createQueryClient } from '@/services/queryClient';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Provider order: theme (UI) → server state (React Query) → toasts → auth session → router.
 */
export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
