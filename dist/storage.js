"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = void 0;
const getStorage = ({ constants, logger, getValue, setValue, }) => {
    const { STORAGE_KEY, MAX_AGE_DAYS } = constants;
    const defaultStorage = {};
    // Get entire storage object.
    const getStorage = () => getValue(STORAGE_KEY, defaultStorage);
    // Get single entry by key.
    const get = (key) => getStorage()[key];
    // Get all entries.
    const getAll = () => Object.entries(getStorage());
    // Repsert entry.
    const set = (id, value) => {
        // const storage = GM_getValue<Storage>(STORAGE_KEY, {} as Storage);
        const storage = getStorage();
        if (!storage)
            throw Error("Null storage");
        storage[id] = value;
        // GM_setValue(STORAGE_KEY, storage);
        setValue(STORAGE_KEY, storage);
    };
    // Delete single entry.
    const deleteValue = (key) => {
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
    return {
        set,
        get,
        getAll,
        delete: deleteValue,
        clear,
        purge,
    };
};
exports.getStorage = getStorage;
