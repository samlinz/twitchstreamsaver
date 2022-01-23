"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentGetter = exports.getTimeouts = exports.getLogger = exports.getCache = exports.getTwitchUrlTool = void 0;
const getTwitchUrlTool = () => {
    const getTimedVodUrl = (id, hours, minutes, seconds) => {
        return `https://www.twitch.tv/videos/${id}?t=${hours}h${minutes}m${seconds}s`;
    };
    return {
        getTimedUrl: getTimedVodUrl,
    };
};
exports.getTwitchUrlTool = getTwitchUrlTool;
const getCache = (fnGetValue) => {
    const EXPIRATION_TIME_MS = 5 * 60 * 1000;
    let value;
    let timestamp;
    function getEntry() {
        if (Date.now() < timestamp + EXPIRATION_TIME_MS) {
            return value;
        }
        const newValue = fnGetValue();
        timestamp = Date.now();
        value = newValue;
        return value;
    }
    return getEntry;
};
exports.getCache = getCache;
// Logger.
const getLogger = ({ constants }) => {
    const { LOGGING, LOG_PREFIX } = constants;
    function logError(...msgs) {
        if (!LOGGING)
            return;
        console.error(LOG_PREFIX, ...msgs);
    }
    function logInfo(...msgs) {
        if (!LOGGING)
            return;
        console.log(LOG_PREFIX, ...msgs);
    }
    function logWarn(...msgs) {
        if (!LOGGING)
            return;
        console.warn(LOG_PREFIX, ...msgs);
    }
    return {
        error: logError,
        log: logInfo,
        warn: logWarn,
    };
};
exports.getLogger = getLogger;
const getTimeouts = ({ constants }) => {
    const set = (fn, ms) => {
        return window.setTimeout(fn, ms);
    };
    const setInterval = (fn, ms) => {
        return window.setInterval(fn, ms);
    };
    const remove = (id) => {
        return clearTimeout(id);
    };
    return {
        set,
        setInterval,
        remove,
    };
};
exports.getTimeouts = getTimeouts;
const getDocumentGetter = () => () => {
    return window.document;
};
exports.getDocumentGetter = getDocumentGetter;
