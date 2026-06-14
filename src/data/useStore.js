import { useState, useCallback, useEffect } from 'react';
import { getAll, saveAll, create, update, remove } from './store';

/**
 * Custom hook that syncs React state with localStorage and the Backend API.
 * Uses optimistic updates: instantly updates UI/localStorage, syncs to API in background.
 */
export function useStore(key) {
  const [items, setItems] = useState(() => getAll(key));

  const refresh = useCallback(() => {
    setItems(getAll(key));
  }, [key]);

  const addItem = useCallback((item) => {
    const newItem = create(key, item);
    setItems(getAll(key));
    return newItem;
  }, [key]);

  const updateItem = useCallback((id, updates) => {
    const updated = update(key, id, updates);
    setItems(getAll(key));
    return updated;
  }, [key]);

  const removeItem = useCallback((id) => {
    remove(key, id);
    setItems(getAll(key));
  }, [key]);

  const replaceAll = useCallback((newItems) => {
    saveAll(key, newItems);
    setItems(newItems);
  }, [key]);

  // Initial Sync from Backend on mount
  useEffect(() => {
    const endpoint = key.replace('crm_', '');
    fetch(`/api/${endpoint}`)
      .then(r => {
        if (!r.ok) throw new Error('API Sync Failed');
        return r.json();
      })
      .then(data => {
        saveAll(key, data);
        setItems(data);
      })
      .catch(err => {
        console.log(`Using offline cache for ${key}`, err);
      });
  }, [key]);

  return { items, addItem, updateItem, removeItem, replaceAll, refresh };
}
