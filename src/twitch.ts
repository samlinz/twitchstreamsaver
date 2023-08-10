import { Services, sortByProp } from "./common";
import { getConstants } from "./constants";
import { getLogger, getCache, getTimeouts, onlyUnique } from "./misc";
import { getInterval } from "./process";
import { getStorage } from "./storage";
import {
  getUserInterface,
  MenuAction,
  getDefaultMenuActions,
  initUserinterface,
} from "./ui";

export const getTwitchUrlTool = () => {
  const getTimedVodUrl = (id: string, time: number[]) => {
    const [hours, minutes, seconds] = time;
    return `https://www.twitch.tv/videos/${id}?t=${hours}h${minutes}m${seconds}s`;
  };
  return {
    getTimedUrl: getTimedVodUrl,
  };
};

export const getTwitchParser = ({ logger }: Services): VideoPageParser => {
  function getVideoId(location: Location) {
    const parts = location.pathname.split("/");
    return parts[parts.length - 1];
  }

  const getJsonLdInfo = () => {
    const el = document.querySelector(
      "script[type='application/ld+json']"
    )?.textContent;
    if (!el) return null;
    const values = JSON.parse(el)[0];
    return values || null;
  };

  function getTime(document: Document) {
    const el = document.querySelector(
      ".vod-seekbar-time-labels [data-a-target='player-seekbar-current-time']"
    );
    if (!el) return null;
    if (!el.textContent) return null;
    return el.textContent.split(":").map((s) => Number(s));
  }

  function getStreamer(document: Document) {
    // Primarily use the DOM element, but it's only available in theater mode I guess.
    // const el = document.querySelector(
    //   "[data-a-target='player-info-title'] > a"
    // );
    // const ld = getJsonLdInfo();

    // const el = document.querySelector("[aria-label~='Viewers']");
    // if (!el) {
    //   // If the title element is not available, use document title.
    //   const title = document.title.split("-");
    //   if (title.length < 2) return null;
    //   return title[0].trim();
    // }
    // return el.getAttribute("aria-label")?.split(" ")[0] || null;

    const rooms = Array.from(document.querySelectorAll("[data-room]")).map(
      (x) => x.getAttribute("data-room")
    );
    const uniqueRooms = onlyUnique(rooms);
    return uniqueRooms.join(",");

    // const { name, description } = ld;
    // const name1 = name.split("-")[0].trim();
    // return name1;
  }

  function getStreamName(document: Document) {
    // Just use the document title.
    return document.title.split("-")[0].trim();

    // In theater or fullscreen.
    // let el = document.querySelector(
    //   ".stream-info-card [data-test-selector='stream-info-card-component__subtitle']"
    // );
    // if (!el) {
    //   // Alternatively, get it from the title card below the player.
    //   el = document.querySelector("[data-a-target='stream-title']");
    //   if (!el) return null;
    //   if (!el.textContent) return null;
    //   return el.textContent.split("•")[0];
    // }
    // return el.textContent;

    // const ld = getJsonLdInfo();
    // const { name, description } = ld;
    // return description;
  }

  return {
    getVideoId,
    getTime,
    getVideoName: getStreamName,
    getChannel: getStreamer,
  };
};

export const buildTwitchVariant: ProcessVariantBuilder = () => {
  let currentInterval: ReturnType<
    ReturnType<typeof getInterval>["start"]
  > | null;
  const constants = getConstants();
  const logger = getLogger({ constants });
  const services: Services = {
    constants,
    logger,
  };
  const cache = getCache(services);
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

  logger?.log("Initializing Twitch");
  logger?.log("Constants", {
    ...constants,
  });

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

  const menuActions: MenuAction[] = [
    ...getDefaultMenuActions({
      logger,
      storage,
      ui,
    }),
  ].sort(sortByProp("title"));

  return {
    init() {
      // Purge too old stored values.
      storage.purge();

      // Check the URL again at intervals because Twitch is SPA and the script doesn't load again when navigating.
      checkURL();
      timeouts.setInterval(checkURL, constants.INTERVAL_MATCH_URL);

      initUserinterface({
        constants,
        logger,
        registerMenu: GM_registerMenuCommand,
        actions: menuActions,
      });
    },
  };
};
