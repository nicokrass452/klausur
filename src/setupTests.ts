import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the idb library to avoid "indexedDB is not defined" errors in jsdom
vi.mock('idb', () => ({
  openDB: vi.fn(async (dbName: string, version: number, options: any) => {
    // In-memory storage for the test run
    const stores: Record<string, Map<string, any>> = {
      pendingWrites: new Map(),
      meta: new Map(),
    };

    // Call upgrade callback if provided
    if (options?.upgrade) {
      const mockDb = {
        objectStoreNames: {
          contains: (name: string) => stores[name] !== undefined,
        },
        createObjectStore: (name: string) => {
          stores[name] = new Map();
        },
      };
      options.upgrade(mockDb, 0, version, {} as any, {} as any);
    }

    // Return a mock database object with the methods we use
    return {
      put: (storeName: string, value: any, key?: string) => {
        const id = key || value.id;
        stores[storeName]?.set(id, value);
        return Promise.resolve();
      },
      get: (storeName: string, key: string) => {
        return Promise.resolve(stores[storeName]?.get(key));
      },
      delete: (storeName: string, key: string) => {
        stores[storeName]?.delete(key);
        return Promise.resolve();
      },
      getAll: (storeName: string) => {
        return Promise.resolve(Array.from(stores[storeName]?.values() || []));
      },
      clear: (storeName: string) => {
        stores[storeName]?.clear();
        return Promise.resolve();
      },
    };
  }),
}));