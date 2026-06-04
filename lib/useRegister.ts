'use client';

import { useEffect, useState } from 'react';
import { store, subscribe } from './store';
import { StoredObligation } from './schema';

export function useRegister(): StoredObligation[] {
  const [rows, setRows] = useState<StoredObligation[]>([]);
  useEffect(() => {
    setRows(store.list());
    return subscribe(() => setRows(store.list()));
  }, []);
  return rows;
}
