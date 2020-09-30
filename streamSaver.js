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

// How often the state is stored.
const UPDATE_INTERVAL = 5000;

// How long the state is stored until it's cleared.
const MAX_AGE_DAYS = 30;

const LOGGING = true;
const LOG_PREFIX = "STREAM_SAVER: ";

// Internal constants.
const STORAGE_KEY = "stored_values";
const DIALOG_DOM_ID = "stream-saver-dialog";

/*
 * Persistence.
 */

function setStored(id, value) {
  const storage = GM_getValue(STORAGE_KEY, {});
  storage[id] = value;
  GM_setValue(STORAGE_KEY, storage);
}

function getStored(key) {
  const storage = GM_getValue(STORAGE_KEY, {});
  return storage[key];
}

function getAllStored() {
  return Object.entries(GM_getValue(STORAGE_KEY, {}));
}

function deleteValue(key) {
  const oldStorage = GM_getValue(STORAGE_KEY, {});
  const { [key]: valueToRemove, ...newStorage } = oldStorage;
  GM_setValue(STORAGE_KEY, newStorage);
  return !!valueToRemove;
}

function deleteStorage() {
  GM_setValue(STORAGE_KEY, {});
}

/*
 * Query functions.
 * 
 * These query the state of the stream from DOM or BOM so these are the most
 * brittle and have to be updated whenever Twitch introduces breaking changes to its UI.
 */

function getVideoId(location) {
  const parts = location.pathname.split("/");
  return parts[parts.length - 1];
}

function getTime(document) {
  const el = document.querySelector(".vod-seekbar-time-labels [data-a-target='player-seekbar-current-time']");
  if (!el) return null;
  return el.textContent.split(":").map(s => Number(s));
}

function getStreamer(document) {
  // Primarily use the DOM element, but it's only available in theater mode I guess.
  const el = document.querySelector("[data-a-target='player-info-title'] > a");
  
  if (!el) {
    // If the title element is not available, use document title.
    const title = document.title.split("-");
    if (title.length < 2) return null;
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
    if (!el) return null;
    return el.textContent.split("•")[0]
  }
  
  return el.textContent;
}

/*
 * Misc. utils.
 */

function getTimedVodUrl(id, hours, minutes, seconds) {
  return `https://www.twitch.tv/videos/${id}?t=${hours}h${minutes}m${seconds}s`;
}

/*
 * Logging functions.
 */

function logError(...msgs) {
  if (!LOGGING) return;
  console.error(LOG_PREFIX, ...msgs);
}

function logInfo(...msgs) {
  if (!LOGGING) return;
  console.log(LOG_PREFIX, ...msgs);
}

function logWarn(...msgs) {
  if (!LOGGING) return;
  console.warn(LOG_PREFIX, ...msgs);
}

/*
 * Entry point.
 */

(() => {
  logInfo("Initializing");
  
  // Purge too old stored values.
  {
    for (const [key, { timestamp }] of getAllStored()) {
      if (!timestamp) {
        logError(`Invalid timestamp for ${key}`);
        continue;
      }
      const age = Date.now() - timestamp;
      const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      //const maxAgeMs = 30000;
      if (age > maxAgeMs) {
        if(deleteValue(key)) {
          logInfo(`Removed old stored value ${key}`);
        }
      }
      
      //logInfo(`Checked ${key} age ${age}`)
    }
  }
  
  if (location.pathname.startsWith("/videos")) {
    logInfo("Starting update interval");
    
    // Start recording updated information.
    const id = getVideoId(location);
    if (!id || isNaN(id))  {
      return logError("Could not get video ID");
    }
    
    let streamName = null, streamerName = null;
  
    function main() {
      if (!streamName) {
        streamName = getStreamName(document);
      }
      
      if (!streamerName) {
        streamerName = getStreamer(document);
      }
      
      if (!streamName || !streamerName) {
        return logWarn("Could not fetch VOD information");
      }

      const time = getTime(document);
      
      if (!getTime) {
        return logWarn("Could not fetch time information");
      }
      
      // Don't immediately store anything.
      const [hours, minutes, seconds] = time;
      if (hours === 0 && minutes < 1) {
        return logInfo("Not storing anything yet");
      }
      
      const timestamp = Date.now();
      setStored(id, {
        timestamp: timestamp,
        humanTime: new Date(timestamp).toISOString(),
        value: time,
        streamName: streamName,
        streamerName: streamerName,
        url: getTimedVodUrl(id, hours, minutes, seconds)
      });
      
      logInfo(`Saved ${time.join(":")} for ${id}`);
    }

      window.addEventListener("load", () => {
        setInterval(main, UPDATE_INTERVAL);
      });  
  }
  
  GM_registerMenuCommand("Dump stored values", () => {
    const storedValues = getAllStored();
    storedValues.sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    })
    logInfo(`\n${JSON.stringify(storedValues, null, 2)}`)
  });
  
  GM_registerMenuCommand("Nuke DB", () => {
    deleteStorage();
    logInfo(`Removed all entries`);
  });

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
      zIndex: 1000,
      display: "flex",
      justifyContent: "center"
    });
    
    // Close the dialog when clicking outside.
    rootElement.addEventListener("click", () => {
      rootElement.style.display = "none";
    })
    
    // Center the table on the page.
    const tableContainer = document.createElement("div");
    Object.assign(tableContainer.style, {
      height: "100%",
      width: "75%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
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
      fontSize: "1.1em"
    });
    tableContainer.appendChild(tableWrapper);
    
    // Table element.
    const table = document.createElement("table");
    table.addEventListener("click", ev => {
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
    
    // Table headers.
    let th = document.createElement("th");
    th.textContent = "Streamer";
    tableHeader.appendChild(th);
    th = document.createElement("th");
    th.textContent = "Name";
    tableHeader.appendChild(th);
    th = document.createElement("th");
    th.textContent = "Timestamp";
    tableHeader.appendChild(th);
    th = document.createElement("th");
    th.textContent = "Stored";
    tableHeader.appendChild(th);
    th = document.createElement("th");
    th.textContent = "URL";
    tableHeader.appendChild(th);
    th = document.createElement("th");
    th.textContent = "Actions";
    tableHeader.appendChild(th);
    
    // Sort stored values by timestamp in descending order.
    const storedValues = getAllStored();
    storedValues.sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    })
    
    // Make data rows for each stored value.
    for (const [videoId, { humanTime, value, streamName, streamerName, url}] of storedValues) {
      let tr = document.createElement("tr");
      
      let td = document.createElement("td");
      td.textContent = streamerName;
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
      })
      td.title = streamerName;
      tr.appendChild(td);
      
      td = document.createElement("td");
      td.textContent = streamName;
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
      })
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
        textOverflow: "ellipsis"
      })
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
        textOverflow: "ellipsis"
      })
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
        logInfo(`Removed stored valued ${videoId}`)
      });
      deleteBtn.textContent = "DELETE";
      td.appendChild(deleteBtn);
      tr.appendChild(td);
      
      tableBody.appendChild(tr);
    }
    
    tableWrapper.appendChild(table);
    
    document.body.appendChild(rootElement)
  }
  
  // Register menu command that opens the dialog.
  GM_registerMenuCommand("Dialog", () => {
    const el = document.getElementById(DIALOG_DOM_ID);
    if (el) {
      // Remove the dialog if open.
      el.parentElement.removeChild(el);
    }
    createDialog();
  });
  
  logInfo("Initialized");
})();
