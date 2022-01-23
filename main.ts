import { Services } from "./common";
import { Constants, getConstants } from "./constants";
import {
  getCache,
  getLogger,
  getTimeouts,
  getTwitchUrlTool,
  TempCache,
  TimeoutId,
  Timeouts,
  UrlTool,
} from "./misc";
import { getTwitchParser, VideoPageParser } from "./parse";
import { getStorage, StorageApi } from "./storage";

const getInterval = ({
  logger,
  parser,
  urlTool,
  storage,
  document: rootDocument,
  cache,
  constants,
  timeouts,
}: Services & {
  parser: VideoPageParser;
  urlTool: UrlTool;
  storage: StorageApi;
  document: Document;
  cache: TempCache;
  constants: Constants;
  timeouts: Timeouts;
}) => {
  const { INTERVAL_UPDATE_TIME } = constants;

  function runInterval({
    fnGetTime,
    fnGetStreamName,
    fnGetStreamerName,
    fnSetStored,
    fnGetTimedVodUrl,
    id,
  }: {
    fnGetTime: () => number[] | null;
    fnGetStreamName: () => string | null;
    fnGetStreamerName: () => string | null;
    fnSetStored: StorageApi["set"];
    fnGetTimedVodUrl: UrlTool["getTimedUrl"];
    id: string;
  }) {
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

    const fnGetCachedStreamerName = getCache(() => {
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

export function main() {
  let currentInterval: ReturnType<
    ReturnType<typeof getInterval>["start"]
  > | null;
  const constants = getConstants();
  const logger = getLogger({ constants });
  const services: Services = {
    constants,
    logger,
  };
  const cache = getCache;
  const document = window.document;
  const parser = getTwitchParser(services);
  const urlTool = getTwitchUrlTool();
  const storage = getStorage({
    ...services,
    getValue: GM_getValue,
    setValue: GM_setValue,
  });
  const timeouts = getTimeouts(services);
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
        logger?.log(
          `Current pathname '${currentPathName}' matches Twitch video portal, starting tracking`
        );
        //   let currentInterval = process.start();
        currentInterval = process.start();
      }
    } else if (currentInterval) {
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
