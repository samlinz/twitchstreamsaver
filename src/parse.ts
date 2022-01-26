import { Services } from "./common";

export type VideoPageParser = {
  getVideoId: (location: Location) => string | null;
  getTime: (document: Document) => number[] | null;
  getVideoName: (document: Document) => string | null;
  getChannel: (document: Document) => string | null;
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
        .querySelector("ytd-video-owner-renderer")
        ?.querySelector(".yt-formatted-string")?.textContent || null
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

export const getTwitchParser = ({ logger }: Services): VideoPageParser => {
  function getVideoId(location: Location) {
    const parts = location.pathname.split("/");
    return parts[parts.length - 1];
  }

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
    const el = document.querySelector(
      "[data-a-target='player-info-title'] > a"
    );

    if (!el) {
      // If the title element is not available, use document title.
      const title = document.title.split("-");
      if (title.length < 2) return null;
      return title[0].trim();
    }

    return el.textContent;
  }

  function getStreamName(document: Document) {
    // In theater or fullscreen.
    let el = document.querySelector(
      ".stream-info-card [data-test-selector='stream-info-card-component__subtitle']"
    );

    if (!el) {
      // Alternatively, get it from the title card below the player.
      el = document.querySelector("[data-a-target='stream-title']");
      if (!el) return null;
      if (!el.textContent) return null;
      return el.textContent.split("•")[0];
    }

    return el.textContent;
  }

  return {
    getVideoId,
    getTime,
    getVideoName: getStreamName,
    getChannel: getStreamer,
  };
};
