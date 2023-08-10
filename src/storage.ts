import { Services, StorageEntry } from "./common";

type StorageFunctions = {
  getValue: typeof GM_getValue;
  setValue: typeof GM_setValue;
};

export type StorageApi = ReturnType<typeof getStorage>;
export const getStorage = <TKey extends string = string>({
  constants,
  logger,
  getValue,
  setValue,
  variant,
}: Services & StorageFunctions & { variant: string }) => {
  type Storage = Record<TKey, StorageEntry>;

  const { STORAGE_KEY: _STORAGE_KEY, MAX_AGE_DAYS } = constants;
  const STORAGE_KEY = `${_STORAGE_KEY}_${variant}`;
  const defaultStorage = {} as Storage;

  // Get entire storage object.
  const getStorage = () => getValue(STORAGE_KEY, defaultStorage) as Storage;

  // Get single entry by key.
  const get = (key: TKey) => getStorage()[key];

  // Get all entries.
  const getAll = () => Object.entries(getStorage()) as [TKey, StorageEntry][];

  // Set entry.
  const set = (id: TKey, value: StorageEntry) => {
    const storage = getStorage();
    if (!storage) throw Error("Null storage");
    storage[id] = value;

    setValue(STORAGE_KEY, storage);
    // logger?.log(`STORAGE ${STORAGE_KEY} - ${id}: ${JSON.stringify(value)}`);
  };

  // Delete single entry.
  const deleteValue = (key: TKey) => {
    const oldStorage = getStorage();
    const { [key]: valueToRemove, ...newStorage } = oldStorage;
    setValue(STORAGE_KEY, newStorage);
    return !!valueToRemove;
  };

  // Clear entire storage.
  const clear = () => setValue(STORAGE_KEY, {});

  // Purge old entries.
  const purge = () => {
    for (const [key, { timestamp }] of getAll()) {
      if (!timestamp) {
        logger?.error(`Invalid timestamp for ${key}`);
        continue;
      }
      const age = Date.now() - timestamp;
      const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      if (age > maxAgeMs) {
        if (deleteValue(key)) {
          logger?.log(`Removed old stored value ${key}`);
        }
      }
    }
  };

  const exportDb = () => {
    const store = getValue(STORAGE_KEY, defaultStorage) as Storage;
    return store;
  };

  const importDb = (storage: Storage) => {
    if (!storage) throw Error("Null storage");
    setValue(STORAGE_KEY, storage);
  };

  return {
    set,
    get,
    getAll,
    delete: deleteValue,
    clear,
    purge,
    import: importDb,
    export: exportDb,
  };
};
