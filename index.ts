// ==UserScript==
// @name        Twitch Stream Saver
// @namespace   samlinz
// @match       https://www.twitch.tv/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @icon https://static.twitchcdn.net/assets/favicon-32-d6025c14e900565d6177.png
// @version     1.0
// @author      samlinz
// @description 9/21/2020, 1:20:46 PM
// ==/UserScript==

/*

  This userscript is active on Twitch.tv's web portal.
  
  When watching a video on demand (VOD) under /videos/ URL this script
  periodically stores the video's name and other info with the current timestamp.
  
  The script adds menu item to extension's context menu that opens a dialog element
  which lists the stored VODs, ordered from most recently watched to the oldest with
  a link to continue watching from the most recent point.
  
  The stored values are cleared after a given period of not being watched.

  This is used and tested with ViolentMonkey.

*/

let timeoutDebugDialog;
let lastStored;
let currentInterval;

/*
 * Persistence.
 */

/*
 * Query functions.
 *
 * These query the state of the stream from DOM or BOM so these are the most
 * brittle and have to be updated whenever Twitch introduces breaking changes to its UI.
 */

/*
 * Misc. utils.
 */

/*
 * Logging functions.
 */

logInfo("Initializing");

function startInterval({ logInfo, logWarn, logError }) {
  logInfo("Starting update interval");

  // Start recording updated information.
  const id = getVideoId(location);
  if (!id || isNaN(id)) {
    return logError("Could not get video ID");
  }

  const rootDocument = window.document;
  const fnGetTime = () => getTime(rootDocument);

  const fnGetCachedStreamName = getCache(() => {
    const newStreamName = getStreamName(rootDocument);
    logInfo(`Got current stream name: '${newStreamName}'`);
    return newStreamName;
  });

  const fnGetCachedStreamerName = getCache(() => {
    const newStreamerName = getStreamer(rootDocument);
    logInfo(`Got current streamer: '${newStreamerName}'`);
    return newStreamerName;
  });

  const fnRunInterval = runInterval.bind(null, {
    fnGetStreamName: fnGetCachedStreamName,
    fnGetStreamerName: fnGetCachedStreamerName,
    fnSetStored: setStored,
    fnGetTime: fnGetTime,
    fnGetTimedVodUrl: getTimedVodUrl,
    logInfo: logInfo,
    logWarn: logWarn,
    logError: logError,
    id: id,
  });

  const intervalId = setInterval(fnRunInterval, INTERVAL_UPDATE_TIME);

  logInfo(`Starting interval ${intervalId}`);

  return {
    cancel: () => {
      logInfo(`Cancelling interval ${intervalId}`);
      clearInterval(intervalId);
    },
  };
}

function runInterval({
  logInfo,
  logWarn,
  logError,
  fnGetTime,
  fnGetStreamName,
  fnGetStreamerName,
  fnSetStored,
  fnGetTimedVodUrl,
  id,
}) {
  const streamName = fnGetStreamName();
  const streamerName = fnGetStreamerName();

  if (!streamName || !streamerName) {
    return logWarn("Could not fetch VOD information");
  }

  const time = fnGetTime();

  if (!time) {
    return logWarn("Could not fetch time information");
  }

  // Don't immediately store anything.
  const [hours, minutes, seconds] = time;
  if (hours === 0 && minutes < 1) {
    return logInfo("Not storing anything yet");
  }

  const timestamp = Date.now();
  fnSetStored(id, {
    timestamp: timestamp,
    humanTime: new Date(timestamp).toISOString(),
    value: time,
    streamName: streamName,
    streamerName: streamerName,
    url: fnGetTimedVodUrl(id, hours, minutes, seconds),
  });

  const storedTimeStr = time.join(":");
  logInfo(`Saved ${storedTimeStr} for ${id}`);

  // Global for debug.
  lastStored = storedTimeStr;
}

/*
 * UI functions.
 */

// Build and show the dialog DOM element.
function createDialog() {
  const rootElement = document.createElement("div");
  rootElement.id = DIALOG_DOM_ID;
  Object.assign(rootElement.style, {
    width: "100%",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    display: "flex",
    justifyContent: "center",
  });

  // Close the dialog when clicking outside.
  rootElement.addEventListener("click", () => {
    rootElement.style.display = "none";
  });

  // Center the table on the page.
  const tableContainer = document.createElement("div");
  Object.assign(tableContainer.style, {
    height: "100%",
    width: "75%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  });
  rootElement.appendChild(tableContainer);

  const tableWrapper = document.createElement("div");
  Object.assign(tableWrapper.style, {
    width: "100%",
    maxHeight: "50%",
    overflowY: "auto",
    backgroundColor: "aliceblue",
    tableLayout: "fixed",
    color: "black",
    padding: "5px",
    borderRadius: "5px",
    fontSize: "1.1em",
  });
  tableContainer.appendChild(tableWrapper);

  // Table element.
  const table = document.createElement("table");
  table.addEventListener("click", (ev) => {
    ev.stopPropagation();
  });
  Object.assign(table.style, {
    width: "100%",
    height: "100%",
    tableLayout: "fixed",
  });

  const tableHeader = document.createElement("thead");
  tableHeader.style.borderBottom = "1px solid";

  const tableBody = document.createElement("tbody");
  table.appendChild(tableHeader);
  table.appendChild(tableBody);

  function getHeader(text) {
    let th = document.createElement("th");
    th.textContent = text;
    return th;
  }

  // Table headers.
  tableHeader.appendChild(getHeader("Streamer"));
  tableHeader.appendChild(getHeader("Name"));
  tableHeader.appendChild(getHeader("Timestamp"));
  tableHeader.appendChild(getHeader("Stored"));
  tableHeader.appendChild(getHeader("URL"));
  tableHeader.appendChild(getHeader("Actions"));

  // Sort stored values by timestamp in descending order.
  const storedValues = getAllStored();
  storedValues.sort((a, b) => {
    return b[1].timestamp - a[1].timestamp;
  });

  // Make data rows for each stored value.
  for (const [
    videoId,
    { humanTime, value, streamName, streamerName, url },
  ] of storedValues) {
    let tr = document.createElement("tr");

    let td = document.createElement("td");
    td.textContent = streamerName;
    Object.assign(td.style, {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    td.title = streamerName;
    tr.appendChild(td);

    td = document.createElement("td");
    td.textContent = streamName;
    Object.assign(td.style, {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    td.title = streamName;
    tr.appendChild(td);

    td = document.createElement("td");
    td.style.textAlign = "center";
    td.textContent = value.join(":");
    tr.appendChild(td);

    td = document.createElement("td");
    td.textContent = humanTime;
    Object.assign(td.style, {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    td.title = humanTime;
    tr.appendChild(td);

    // Create the link that takes user to the last watched point.
    td = document.createElement("td");
    const link = document.createElement("a");
    link.href = url;
    link.textContent = url;
    Object.assign(td.style, {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    td.title = url;
    td.appendChild(link);
    tr.appendChild(td);

    // Button to explicitly delete the stored value.
    td = document.createElement("td");
    td.style.textAlign = "right";
    const deleteBtn = document.createElement("button");
    deleteBtn.addEventListener("click", () => {
      deleteValue(videoId);
      tr.style.display = "none";
      logInfo(`Removed stored valued ${videoId}`);
    });
    deleteBtn.textContent = "DELETE";
    td.appendChild(deleteBtn);
    tr.appendChild(td);

    tableBody.appendChild(tr);
  }

  tableWrapper.appendChild(table);

  document.body.appendChild(rootElement);
}

// Create a debug dialog that lists various variables.
function createDebug() {
  removeDialogIfPresent();

  const wrapperEl = document.createElement("div");
  wrapperEl.id = DIALOG_DOM_ID;
  wrapperEl.style.cssText = "background: black; z-index: 1000;";
  const dlEl = document.createElement("dl");

  function createDefinition(key, value) {
    const dtEl = document.createElement("dt");
    const ddEl = document.createElement("dd");

    dtEl.textContent = key;
    ddEl.textContent = value;

    ddEl.style.marginLeft = "2em";
    ddEl.style.fontWeigth = "bolder";

    return [dtEl, ddEl];
  }

  const videoId = getVideoId(location);
  const time = getTime(document);
  const debugProperties = {
    VIDEO_ID: videoId,
    STREAMER: getStreamer(document),
    TIME: time,
    STREAM_NAME: getStreamName(document),
    URL: getTimedVodUrl(videoId, ...time),
    LAST_STORED: lastStored,
  };

  const children = Object.entries(debugProperties)
    .map(([key, value]) => createDefinition(key, value))
    .flat();

  children.forEach((el) => dlEl.appendChild(el));

  wrapperEl.appendChild(dlEl);
  document.body.appendChild(wrapperEl);

  logInfo("Showing debug dialog");

  timeoutDebugDialog = setTimeout(createDebug, 1000);
}

// Remove existing dialog from DOM.
function removeDialogIfPresent() {
  const el = document.getElementById(DIALOG_DOM_ID);
  if (el) {
    // Remove the dialog if open.
    el.parentElement.removeChild(el);
    return true;
  }
  return false;
}

// Register menu command that opens the dialog.
GM_registerMenuCommand("Dialog", () => {
  clearTimeout(timeoutDebugDialog);
  removeDialogIfPresent();
  createDialog();
});

// Register menu command that opens the dialog.
GM_registerMenuCommand("Debug", () => {
  clearTimeout(timeoutDebugDialog);
  if (removeDialogIfPresent()) {
    logInfo("Closing debug dialog");
    return;
  }
  createDebug();
});

GM_registerMenuCommand("Dump stored values", () => {
  const storedValues = getAllStored();
  storedValues.sort((a, b) => {
    return b[1].timestamp - a[1].timestamp;
  });
  logInfo(`\n${JSON.stringify(storedValues, null, 2)}`);
});

GM_registerMenuCommand("Nuke DB", () => {
  deleteStorage();
  logInfo(`Removed all entries`);
});

/*
 * Entry point.
 */
window.addEventListener("load", () => {
  // Purge too old stored values.
  removeExpiredValues();

  function checkURL() {
    logInfo("Matching URL");
    const currentPathName = location.pathname;
    if (currentPathName.startsWith("/videos")) {
      if (!currentInterval) {
        logInfo(
          `Current pathname '${currentPathName}' matches Twitch video portal, starting tracking`
        );
        currentInterval = startInterval({ logInfo, logWarn, logError });
      }
    } else if (currentInterval) {
      // Remove running interval.
      currentInterval.cancel();
      currentInterval = null;
    }
  }

  checkURL();
  logInfo("Initialized");

  // Check the URL again at intervals because Twitch is SPA and the script doesn't load again when navigating.
  setInterval(checkURL, INTERVAL_MATCH_URL);
});
