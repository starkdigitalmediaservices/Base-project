import { useCallback, useState } from 'react';

interface FormModalState<T> {
  isOpen: boolean;
  /** Item being edited, or null when creating. */
  item: T | null;
  /** Changes on every open so the form can be re-mounted with fresh default values (use as key). */
  version: number;
}

/** Create/edit modal state that keeps the close animation and resets the form on each open. */
export function useFormModal<T>() {
  const [state, setState] = useState<FormModalState<T>>({ isOpen: false, item: null, version: 0 });

  const openCreate = useCallback(() => {
    setState((current) => ({ isOpen: true, item: null, version: current.version + 1 }));
  }, []);

  const openEdit = useCallback((item: T) => {
    setState((current) => ({ isOpen: true, item, version: current.version + 1 }));
  }, []);

  const close = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false }));
  }, []);

  return { ...state, openCreate, openEdit, close };
}
