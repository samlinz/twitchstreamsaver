import { Services } from "./common";
import { Constants, getConstants } from "./constants";
import {
  getCache,
  getLogger,
  getTimeouts,
  getTwitchUrlTool,
  getYoutubeUrlTool,
  TempCache,
  Timeouts,
  UrlTool,
} from "./misc";
import { getTwitchParser, getYoutubeParser, VideoPageParser } from "./parse";
import { getStorage, StorageApi } from "./storage";
import { getUserInterface, initUserinterface } from "./ui";

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
  let i = 1;

  function runInterval({
    fnGetTime,
    fnGetStreamName,
    fnGetStreamerName,
    fnSetStored,
    fnGetTimedVodUrl,
    options,
    id,
  }: {
    fnGetTime: () => number[] | null;
    fnGetStreamName: () => string | null;
    fnGetStreamerName: () => string | null;
    fnSetStored: StorageApi["set"];
    fnGetTimedVodUrl: UrlTool["getTimedUrl"];
    options: {
      skipStartOfVideo: boolean;
    };
    id: string;
  }) {
    try {
      logger?.log(`Running ${i++}`);

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
      if (options.skipStartOfVideo && hours === 0 && minutes < 1) {
        return logger?.log("Not storing anything yet");
      }

      const timestamp = Date.now();
      const vodUrl = fnGetTimedVodUrl(id, [hours, minutes, seconds]);
      fnSetStored(id, {
        timestamp: timestamp,
        humanTime: new Date(timestamp).toISOString(),
        value: time,
        videoName: streamName,
        channelName: streamerName,
        url: vodUrl,
      });

      const storedTimeStr = time.join(":");
      logger?.log(`Saved ${storedTimeStr} for ${id}`);

      if (constants.DEBUG) {
        logger?.log({
          streamName,
          streamerName,
          time,
          hours,
          minutes,
          seconds,
          timestamp,
          vodUrl,
          storedTimeStr,
        });
      }

      // For debugging.
      storage.set("LAST_STORED", {
        timestamp: Date.now(),
        value: storedTimeStr,
      });
    } catch (e) {
      logger?.error("Error running interval", e);
    }
  }

  const getRunInterval = ({
    skipStartOfVideo = false,
  }: { skipStartOfVideo?: boolean } = {}) => {
    // Start recording updated information.
    const id = parser.getVideoId(location);
    // if (!id || isNaN(Number(id))) {
    if (!id) {
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
      options: {
        skipStartOfVideo,
      },
    });

    return fnRunInterval;
  };

  function startInterval() {
    logger?.log("Starting update interval");
    const fnRunInterval = getRunInterval({
      skipStartOfVideo: true,
    });
    const intervalId = timeouts.setInterval(
      fnRunInterval,
      INTERVAL_UPDATE_TIME
    );

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
    getRunInterval,
  };
};

type ProcessVariant = {
  init: () => void;
};
type ProcessVariantBuilder = () => ProcessVariant;
const buildTwitchVariant: ProcessVariantBuilder = () => {
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
    variant: "twitch",
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
  const ui = getUserInterface({
    constants,
    parser,
    storage,
    timeouts,
    urlTool,
    logger,
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

  return {
    init() {
      // Purge too old stored values.
      storage.purge();
      checkURL();
      // Check the URL again at intervals because Twitch is SPA and the script doesn't load again when navigating.
      timeouts.setInterval(checkURL, constants.INTERVAL_MATCH_URL);

      initUserinterface({
        constants,
        logger,
        storage,
        registerMenu: GM_registerMenuCommand,
        ui,
      });
    },
  };
};

const buildYoutubeVariant: ProcessVariantBuilder = () => {
  // let currentInterval: ReturnType<
  //   ReturnType<typeof getInterval>["start"]
  // > | null;
  const constants = getConstants();
  const logger = getLogger({ constants });
  const services: Services = {
    constants,
    logger,
  };
  const cache = getCache;
  const document = window.document;
  const parser = getYoutubeParser(services);
  const urlTool = getYoutubeUrlTool();
  const storage = getStorage({
    ...services,
    getValue: GM_getValue,
    setValue: GM_setValue,
    variant: "youtube",
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
  const ui = getUserInterface({
    constants,
    parser,
    storage,
    timeouts,
    urlTool,
    logger,
  });

  logger?.log("Initializing");

  // function checkURL() {
  //   logger?.log("Matching URL");
  //   const currentPathName = location.pathname;
  //   if (currentPathName.startsWith("/watch")) {
  //     if (!currentInterval) {
  //       logger?.log(
  //         `Current pathname '${currentPathName}' matches Youtube video page, starting tracking`
  //       );
  //       currentInterval = process.start();
  //     }
  //   } else if (currentInterval) {
  //     // Remove running interval.
  //     currentInterval.cancel();
  //     currentInterval = null;
  //   }
  // }

  return {
    init() {
      // Purge too old stored values.
      storage.purge();
      // checkURL();
      // Check the URL again at intervals because Twitch is SPA and the script doesn't load again when navigating.
      // timeouts.setInterval(checkURL, constants.INTERVAL_MATCH_URL);

      initUserinterface({
        constants,
        logger,
        storage,
        registerMenu: GM_registerMenuCommand,
        ui,
        onStoreValue: () => {
          logger.log("Running interval manually");
          const fn = process.getRunInterval({
            skipStartOfVideo: false,
          });
          fn?.();
        },
      });
    },
  };
};

export function main() {
  const host = location.host;

  // Find out which video service we are actually using.
  if (host.includes("twitch")) {
    buildTwitchVariant().init();
  } else if (host.includes("youtube")) {
    buildYoutubeVariant().init();
  } else {
    throw Error(`${host} didn't match any known portal`);
  }
}
