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

export const getYoutubeUrlTool = () => {
  const getTimedVodUrl = (id: string, time: number[]) => {
    const [hours, minutes, seconds] = time;
    const secondsTotal = (hours || 0) * 3600 + (minutes || 0) * 60 + seconds;
    return `https://youtu.be/${id}?t=${secondsTotal}`;
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
    return (
      document
        .querySelector("[itemprop=author]")
        ?.querySelector("[itemprop=name]")
        ?.getAttribute("content") || null
    );
    // return (
    //   document
    //     .querySelector("ytd-video-owner-renderer")
    //     ?.querySelector(".yt-formatted-string")?.textContent || null
    // );
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

export const buildYoutubeVariant: ProcessVariantBuilder = () => {
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
    },
  };
};
