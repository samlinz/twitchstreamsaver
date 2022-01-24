import { Services } from "./common";
import { TimeoutId, Timeouts, UrlTool } from "./misc";
import { VideoPageParser } from "./parse";
import { StorageApi } from "./storage";

export type UserInterface = ReturnType<typeof getUserInterface>;
export const getUserInterface = ({
  constants,
  storage,
  logger,
  parser,
  urlTool,
  timeouts,
}: Services & {
  storage: StorageApi;
  parser: VideoPageParser;
  urlTool: UrlTool;
  timeouts: Timeouts;
}) => {
  const { DIALOG_DOM_ID } = constants;

  let timeoutDebugDialog: TimeoutId;

  const createDialog = () => {
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

    function getHeader(text: string) {
      const th = document.createElement("th");
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
    const storedValues = storage.getAll();
    storedValues.sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    });

    // Make data rows for each stored value.
    for (const [
      videoId,
      {
        humanTime,
        value,
        videoName: streamName,
        channelName: streamerName,
        url,
      },
    ] of storedValues) {
      const tr = document.createElement("tr");

      let td = document.createElement("td");
      td.textContent = streamerName || "-";
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      });
      td.title = streamerName || "-";
      tr.appendChild(td);

      td = document.createElement("td");
      td.textContent = streamName || "-";
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      });
      td.title = streamName || "-";
      tr.appendChild(td);

      td = document.createElement("td");
      td.style.textAlign = "center";
      td.textContent = value.join(":");
      tr.appendChild(td);

      td = document.createElement("td");
      td.textContent = humanTime || "-";
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      });
      td.title = humanTime || "-";
      tr.appendChild(td);

      // Create the link that takes user to the last watched point.
      td = document.createElement("td");
      const link = document.createElement("a");
      link.href = url || "-";
      link.textContent = url || "-";
      Object.assign(td.style, {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      });
      td.title = url || "-";
      td.appendChild(link);
      tr.appendChild(td);

      // Button to explicitly delete the stored value.
      td = document.createElement("td");
      td.style.textAlign = "right";
      const deleteBtn = document.createElement("button");
      deleteBtn.addEventListener("click", () => {
        storage.delete(videoId);
        tr.style.display = "none";
        logger?.log(`Removed stored valued ${videoId}`);
      });
      deleteBtn.textContent = "DELETE";
      td.appendChild(deleteBtn);
      tr.appendChild(td);

      tableBody.appendChild(tr);
    }

    tableWrapper.appendChild(table);

    document.body.appendChild(rootElement);
  };

  // Create a debug dialog that lists various variables.
  const createDebug = () => {
    removeDialogIfPresent();

    const wrapperEl = document.createElement("div");
    wrapperEl.id = DIALOG_DOM_ID;
    wrapperEl.style.cssText = "background: black; z-index: 1000;";
    const dlEl = document.createElement("dl");

    function createDefinition(key: string, value: any) {
      const dtEl = document.createElement("dt");
      const ddEl = document.createElement("dd");

      dtEl.textContent = key;
      ddEl.textContent = value;

      ddEl.style.marginLeft = "2em";
      ddEl.style.fontWeight = "bolder";

      return [dtEl, ddEl];
    }

    const { value: lastStored } = storage.get("LAST_STORED") || {};
    const videoId = parser.getVideoId(location);
    const time = parser.getTime(document);
    const debugProperties = {
      VIDEO_ID: videoId,
      STREAMER: parser.getChannel(document),
      TIME: time,
      STREAM_NAME: parser.getVideoName(document),
      URL: time
        ? urlTool.getTimedUrl(videoId, time[0], time[1], time[2])
        : null,
      LAST_STORED: lastStored,
    };

    const children = Object.entries(debugProperties)
      .map(([key, value]) => createDefinition(key, value))
      .flat();

    children.forEach((el) => dlEl.appendChild(el));

    wrapperEl.appendChild(dlEl);
    document.body.appendChild(wrapperEl);

    logger?.log("Showing debug dialog");

    timeoutDebugDialog = timeouts.set(createDebug, 1000);
  };

  // Remove existing dialog from DOM.
  function removeDialogIfPresent() {
    const el = document.getElementById(DIALOG_DOM_ID);
    if (el && el.parentElement) {
      // Remove the dialog if open.
      el.parentElement.removeChild(el);
      return true;
    }
    return false;
  }

  function clearDebugTimeout() {
    timeouts.remove(timeoutDebugDialog);
  }

  return {
    removeDialogIfPresent,
    createDialog,
    createDebug,
    clearDebugTimeout,
  };
};

export const initUserinterface = ({
  logger,
  registerMenu,
  ui,
  storage,
}: Services & {
  registerMenu: typeof GM_registerMenuCommand;
  ui: UserInterface;
  storage: StorageApi;
}) => {
  // Register menu command that opens the dialog.
  registerMenu("Dialog", () => {
    // timeouts.remove(timeoutDebugDialog);
    ui.removeDialogIfPresent();
    ui.createDialog();
  });

  // Register menu command that opens the dialog.
  registerMenu("Debug", () => {
    // clearTimeout(timeoutDebugDialog);
    ui.clearDebugTimeout();
    if (ui.removeDialogIfPresent()) {
      logger?.log("Closing debug dialog");
      return;
    }
    // createDebug();
    ui.createDebug();
  });

  registerMenu("Dump stored values", () => {
    const storedValues = storage.getAll();
    storedValues.sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    });
    logger?.log(`\n${JSON.stringify(storedValues, null, 2)}`);
  });

  registerMenu("Nuke DB", () => {
    storage.clear();
    // deleteStorage();
    logger?.log(`Removed all entries`);
  });

  logger?.log("Registered UI");
};
