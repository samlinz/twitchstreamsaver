"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwitchParser = void 0;
const getTwitchParser = ({ logger }) => {
    function getVideoId(location) {
        const parts = location.pathname.split("/");
        return parts[parts.length - 1];
    }
    function getTime(document) {
        const el = document.querySelector(".vod-seekbar-time-labels [data-a-target='player-seekbar-current-time']");
        if (!el)
            return null;
        if (!el.textContent)
            return null;
        return el.textContent.split(":").map((s) => Number(s));
    }
    function getStreamer(document) {
        // Primarily use the DOM element, but it's only available in theater mode I guess.
        const el = document.querySelector("[data-a-target='player-info-title'] > a");
        if (!el) {
            // If the title element is not available, use document title.
            const title = document.title.split("-");
            if (title.length < 2)
                return null;
            return title[0].trim();
        }
        return el.textContent;
    }
    function getStreamName(document) {
        // In theater or fullscreen.
        let el = document.querySelector(".stream-info-card [data-test-selector='stream-info-card-component__subtitle']");
        if (!el) {
            // Alternatively, get it from the title card below the player.
            el = document.querySelector("[data-a-target='stream-title']");
            if (!el)
                return null;
            if (!el.textContent)
                return null;
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
exports.getTwitchParser = getTwitchParser;
