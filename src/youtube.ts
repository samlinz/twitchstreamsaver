import { Services, sortByProp } from "./common";
import { getConstants } from "./constants";
import { getCache, getLogger, getTimeouts } from "./misc";
import { getInterval } from "./process";
import { getStorage } from "./storage";
import {
  getUserInterface,
  MenuAction,
  getDefaultMenuActions,
  initUserinterface,
} from "./ui";

// Parameter added to query string to specify that page was navigated from the extension and we can restart the interval.
const STREAMSAVER_QUERY_STRING = "__ss_check";
const STREAMSAVER_QUERY_STRING_CHECK = `${STREAMSAVER_QUERY_STRING}=1`;

export const getYoutubeUrlTool = () => {
  const getTimedVodUrl = (id: string, time: number[]) => {
    const [hours, minutes, seconds] = time;
    const secondsTotal = (hours || 0) * 3600 + (minutes || 0) * 60 + seconds;

    const url = new URL("https://www.youtube.com/watch");
    url.searchParams.set("v", id);
    url.searchParams.set("t", secondsTotal.toString());
    url.searchParams.set(STREAMSAVER_QUERY_STRING, 1);

    return url.toString();
  };
  return {
    getTimedUrl: getTimedVodUrl,
  };
};

export const getYoutubeParser = ({ logger }: Services): VideoPageParser => {
  function getVideoId(location: Location) {
    return new URL(location.href).searchParams.get("v");
  }

  function getTime(document: Document) {
    const el = document.querySelector(".ytp-time-current");
    const parts = el?.textContent?.split(":").map((s) => Number(s)) || null;
    if (!parts) return null;
    if (parts?.length < 3) {
      return [0, parts[0], parts[1]];
    } else {
      return [parts[0], parts[1], parts[2]];
    }
  }

  function getStreamer(document: Document) {
    const fn1 = () => {
      return (
        document
          .querySelector("[itemprop=author]")
          ?.querySelector("[itemprop=name]")
          ?.getAttribute("content") || null
      );
    };

    const fn2 = () => {
      const raw = document.querySelectorAll("[type='application/ld+json']")[0]
        ?.textContent;
      if (!raw) return null;
      return JSON.parse(raw).author || null;
    };

    const fn3 = () => {
      return (
        document
          .querySelector("ytd-video-owner-renderer")
          ?.querySelector(".yt-formatted-string")?.textContent || null
      );
    };

    // Try multiple ways to fetch VOD author, get first available.
    return (
      [fn2, fn1, fn3]
        .map((fn) => {
          try {
            return fn();
          } catch (error) {
            return null;
          }
        })
        .find(Boolean) || null
    );
  }

  function getStreamName(document: Document) {
    return document.title.split("- YouTube")[0].trim();
  }

  return {
    getVideoId,
    getTime,
    getVideoName: getStreamName,
    getChannel: getStreamer,
  };
};

export const buildYoutubeVariant: ProcessVariantBuilder = ({ initialUrl }) => {
  // let currentInterval: ReturnType<
  //   ReturnType<typeof getInterval>["start"]
  // > | null;
  const constants = getConstants();
  const logger = getLogger({ constants });
  const services: Services = {
    constants,
    logger,
  };
  const cache = getCache(services);
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

  logger?.log("Initializing Youtube");
  logger?.log("Constants", {
    ...constants,
  });

  let interval: { cancel: () => void } | null = null;

  const menuActions: MenuAction[] = [
    ...getDefaultMenuActions({
      logger,
      storage,
      ui,
    }),
    {
      title: "Start interval",
      fnAction: () => {
        logger.log("Starting interval manually");
        interval?.cancel();
        interval = process.start();
      },
    },
    {
      title: "Stop interval",
      fnAction: () => {
        logger.log("Stopping interval manually");
        interval?.cancel();
      },
    },
    {
      title: "Store timestamp",
      fnAction: () => {
        logger.log("Running interval manually");
        const fn = process.getRunInterval({
          skipStartOfVideo: false,
        });
        fn?.();
      },
    },
  ].sort(sortByProp("title"));

  function checkURL() {
    logger?.log("Matching URL", initialUrl);
    const initialUrlParsed = new URL(initialUrl);
    const currentSearch = initialUrlParsed.search;
    const isUrlFromStreamSaver = currentSearch.includes(
      STREAMSAVER_QUERY_STRING_CHECK
    );
    if (isUrlFromStreamSaver) {
      logger.log(
        "Current video was navigated from stream saver; starting interval automatically"
      );
      interval?.cancel();
      interval = process.start();
    }
  }

  return {
    init() {
      // Purge too old stored values.
      storage.purge();

      initUserinterface({
        constants,
        logger,
        registerMenu: GM_registerMenuCommand,
        actions: menuActions,
      });

      setTimeout(checkURL, 1000);
    },
  };
};
