import { useEffect } from 'react';

import { env } from '@/utils/env';

/** Sets document.title to "<title> · <app name>". */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${env.appName}` : env.appName;
  }, [title]);
}
