"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const constants_1 = require("./constants");
const misc_1 = require("./misc");
const parse_1 = require("./parse");
const storage_1 = require("./storage");
const getInterval = ({ logger, parser, urlTool, storage, document: rootDocument, cache, constants, timeouts, }) => {
    const { INTERVAL_UPDATE_TIME } = constants;
    function runInterval({ fnGetTime, fnGetStreamName, fnGetStreamerName, fnSetStored, fnGetTimedVodUrl, id, }) {
        const streamName = fnGetStreamName();
        const streamerName = fnGetStreamerName();
        if (!streamName || !streamerName) {
            return logger?.warn("Could not fetch VOD information");
        }
        const time = fnGetTime();
        if (!time) {
            return logger?.warn("Could not fetch time information");
        }
        // Don't immediately store anything.
        const [hours, minutes, seconds] = time;
        if (hours === 0 && minutes < 1) {
            return logger?.log("Not storing anything yet");
        }
        const timestamp = Date.now();
        fnSetStored(id, {
            timestamp: timestamp,
            humanTime: new Date(timestamp).toISOString(),
            value: time,
            videoName: streamName,
            channelName: streamerName,
            url: fnGetTimedVodUrl(id, hours, minutes, seconds),
        });
        const storedTimeStr = time.join(":");
        logger?.log(`Saved ${storedTimeStr} for ${id}`);
        // For debugging.
        storage.set("LAST_STORED", {
            timestamp: Date.now(),
            value: storedTimeStr,
        });
    }
    function startInterval() {
        logger?.log("Starting update interval");
        // Start recording updated information.
        const id = parser.getVideoId(location);
        if (!id || isNaN(Number(id))) {
            return logger?.error("Could not get video ID");
        }
        // const rootDocument = window.document;
        const fnGetTime = () => parser.getTime(rootDocument);
        const fnGetCachedStreamName = cache(() => {
            const newStreamName = parser.getVideoName(rootDocument);
            logger?.log(`Got current stream name: '${newStreamName}'`);
            return newStreamName;
        });
        const fnGetCachedStreamerName = (0, misc_1.getCache)(() => {
            const newStreamerName = parser.getChannel(rootDocument);
            logger?.log(`Got current streamer: '${newStreamerName}'`);
            return newStreamerName;
        });
        const fnRunInterval = runInterval.bind(null, {
            fnGetStreamName: fnGetCachedStreamName,
            fnGetStreamerName: fnGetCachedStreamerName,
            fnSetStored: storage.set,
            fnGetTime: fnGetTime,
            fnGetTimedVodUrl: urlTool.getTimedUrl,
            id: id,
        });
        const intervalId = timeouts.set(fnRunInterval, INTERVAL_UPDATE_TIME);
        logger?.log(`Starting interval ${intervalId}`);
        return {
            cancel: () => {
                logger?.log(`Cancelling interval ${intervalId}`);
                timeouts.remove(intervalId);
            },
        };
    }
    return {
        start: startInterval,
    };
};
function main() {
    let currentInterval;
    const constants = (0, constants_1.getConstants)();
    const logger = (0, misc_1.getLogger)({ constants });
    const services = {
        constants,
        logger,
    };
    const cache = misc_1.getCache;
    const document = window.document;
    const parser = (0, parse_1.getTwitchParser)(services);
    const urlTool = (0, misc_1.getTwitchUrlTool)();
    const storage = (0, storage_1.getStorage)({
        ...services,
        getValue: GM_getValue,
        setValue: GM_setValue,
    });
    const timeouts = (0, misc_1.getTimeouts)(services);
    const process = getInterval({
        ...services,
        cache,
        document,
        parser,
        storage,
        urlTool,
        timeouts,
    });
    logger?.log("Initializing");
    function checkURL() {
        logger?.log("Matching URL");
        const currentPathName = location.pathname;
        if (currentPathName.startsWith("/videos")) {
            if (!currentInterval) {
                logger?.log(`Current pathname '${currentPathName}' matches Twitch video portal, starting tracking`);
                //   let currentInterval = process.start();
                currentInterval = process.start();
            }
        }
        else if (currentInterval) {
            // Remove running interval.
            currentInterval.cancel();
            currentInterval = null;
        }
    }
    // Purge too old stored values.
    storage.purge();
    checkURL();
    // Check the URL again at intervals because Twitch is SPA and the script doesn't load again when navigating.
    timeouts.setInterval(checkURL, constants.INTERVAL_MATCH_URL);
}
exports.main = main;
