import { Logger, Services } from "./common";
import { getTwitchUrlTool } from "./twitch";

export type UrlTool = ReturnType<typeof getTwitchUrlTool>;

// Super simple cache for quasi-stable values.
export type TempCache = typeof getCache;
export const getCache =
  <T>({ logger }: Services) =>
  <T>(fnGetValue: () => T) => {
    const EXPIRATION_TIME_MS = 5 * 60 * 1000;
    let value: T;
    let timestamp: number;

    function getEntry() {
      if (Date.now() < timestamp + EXPIRATION_TIME_MS) {
        return value;
      }
      const newValue = fnGetValue();

      const isValid = newValue !== undefined && newValue !== null;
      if (!isValid) {
        logger?.warn("Will not cache nil value");
        return value;
      }

      timestamp = Date.now();
      value = newValue;
      return value;
    }

    return getEntry;
  };

// Logger.
export const getLogger = ({ constants }: Services): Logger => {
  const { LOGGING, LOG_PREFIX } = constants;

  function logError(...msgs: any[]) {
    if (!LOGGING) return;
    console.error(LOG_PREFIX, ...msgs);
  }

  function logInfo(...msgs: any[]) {
    if (!LOGGING) return;
    console.log(LOG_PREFIX, ...msgs);
  }

  function logWarn(...msgs: any[]) {
    if (!LOGGING) return;
    console.warn(LOG_PREFIX, ...msgs);
  }

  return {
    error: logError,
    log: logInfo,
    warn: logWarn,
  };
};

export type Timeouts = ReturnType<typeof getTimeouts>;
export type TimeoutId = number;
export const getTimeouts = ({ constants }: Services) => {
  const set = (fn: any, ms: number): TimeoutId => {
    return window.setTimeout(fn, ms);
  };
  const setInterval = (fn: any, ms: number): TimeoutId => {
    return window.setInterval(fn, ms);
  };

  const remove = (id: TimeoutId) => {
    return clearTimeout(id);
  };

  return {
    set,
    setInterval,
    remove,
  };
};

export const getDocumentGetter = () => () => {
  return window.document;
};
