import { Services } from "./common";
import { Constants } from "./constants";
import { UrlTool, TempCache, Timeouts } from "./misc";
import { StorageApi } from "./storage";

export const getInterval = ({
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

      const streamName = fnGetStreamName() || `Unknown ${id}`;
      const streamerName = fnGetStreamerName() || "UKNOWN";

      if (!streamName || !streamerName) {
        return logger?.error("Could not fetch VOD information", {
          streamName,
          streamerName,
        });
      }

      const time = fnGetTime();

      if (!time) {
        return logger?.warn("Could not fetch time information");
      }

      logger?.log("Got time", time);

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

    logger?.log(`Got video ID: '${id}'`);

    // const rootDocument = window.document;
    const fnGetTime = () => parser.getTime(rootDocument);

    const fnGetCachedStreamName = cache(() => {
      const newStreamName = parser.getVideoName(rootDocument);
      logger?.log(`Got current stream name: '${newStreamName}'`);
      return newStreamName;
    });

    const fnGetCachedStreamerName = cache(() => {
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
