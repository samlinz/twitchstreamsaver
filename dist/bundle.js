// ==UserScript==
// @name        Twitch Stream Saver
// @namespace   samlinz
// @match       https://www.twitch.tv/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @icon https://static.twitchcdn.net/assets/favicon-32-d6025c14e900565d6177.png
// @version     7
// @author      samlinz
// @description 9/21/2020, 1:20:46 PM
// ==/UserScript==

(() => {
  var N = () => {
    let e = 1,
      t = 10 * 1e3,
      o = 10 * 1e3,
      r = 30,
      a = !0,
      i = "STREAM_SAVER: ",
      n = `stored_values_ver_${e}`;
    return {
      MAJOR_VER: e,
      INTERVAL_MATCH_URL: o,
      DIALOG_DOM_ID: "stream-saver-dialog",
      STORAGE_KEY: n,
      INTERVAL_UPDATE_TIME: t,
      LOGGING: a,
      LOG_PREFIX: i,
      MAX_AGE_DAYS: r,
    };
  };
  var O = () => ({
      getTimedUrl: (t, o, r, a) =>
        `https://www.twitch.tv/videos/${t}?t=${o}h${r}m${a}s`,
    }),
    _ = (e) => {
      let t = 5 * 60 * 1e3,
        o,
        r;
      function a() {
        if (Date.now() < r + t) return o;
        let i = e();
        return (r = Date.now()), (o = i), o;
      }
      return a;
    },
    G = ({ constants: e }) => {
      let { LOGGING: t, LOG_PREFIX: o } = e;
      function r(...n) {
        !t || console.error(o, ...n);
      }
      function a(...n) {
        !t || console.log(o, ...n);
      }
      function i(...n) {
        !t || console.warn(o, ...n);
      }
      return { error: r, log: a, warn: i };
    },
    L = ({ constants: e }) => ({
      set: (a, i) => window.setTimeout(a, i),
      setInterval: (a, i) => window.setInterval(a, i),
      remove: (a) => clearTimeout(a),
    });
  var U = ({ logger: e }) => {
    function t(i) {
      let n = i.pathname.split("/");
      return n[n.length - 1];
    }
    function o(i) {
      let n = i.querySelector(
        ".vod-seekbar-time-labels [data-a-target='player-seekbar-current-time']"
      );
      return !n || !n.textContent
        ? null
        : n.textContent.split(":").map((m) => Number(m));
    }
    function r(i) {
      let n = i.querySelector("[data-a-target='player-info-title'] > a");
      if (!n) {
        let m = i.title.split("-");
        return m.length < 2 ? null : m[0].trim();
      }
      return n.textContent;
    }
    function a(i) {
      let n = i.querySelector(
        ".stream-info-card [data-test-selector='stream-info-card-component__subtitle']"
      );
      return n
        ? n.textContent
        : ((n = i.querySelector("[data-a-target='stream-title']")),
          !n || !n.textContent ? null : n.textContent.split("\u2022")[0]);
    }
    return { getVideoId: t, getTime: o, getVideoName: a, getChannel: r };
  };
  var V = ({ constants: e, logger: t, getValue: o, setValue: r }) => {
    let { STORAGE_KEY: a, MAX_AGE_DAYS: i } = e,
      n = {},
      m = () => o(a, n),
      v = (u) => m()[u],
      h = () => Object.entries(m()),
      C = (u, p) => {
        let c = m();
        if (!c) throw Error("Null storage");
        (c[u] = p), r(a, c);
      },
      w = (u) => {
        let p = m(),
          { [u]: c, ...d } = p;
        return r(a, d), !!c;
      };
    return {
      set: C,
      get: v,
      getAll: h,
      delete: w,
      clear: () => r(a, {}),
      purge: () => {
        for (let [u, { timestamp: p }] of h()) {
          if (!p) {
            t?.error(`Invalid timestamp for ${u}`);
            continue;
          }
          let c = Date.now() - p,
            d = i * 24 * 60 * 60 * 1e3;
          c > d && w(u) && t?.log(`Removed old stored value ${u}`);
        }
      },
    };
  };
  function D(e) {
    let t = document.createElement("th");
    return (t.textContent = e), t;
  }
  var M = ({
      constants: e,
      storage: t,
      logger: o,
      parser: r,
      urlTool: a,
      timeouts: i,
    }) => {
      let { DIALOG_DOM_ID: n } = e,
        m,
        v = () => {
          try {
            o?.log("Showing dialog");
            let s = document.createElement("div");
            (s.id = n),
              Object.assign(s.style, {
                width: "100%",
                height: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1e4,
                display: "flex",
                justifyContent: "center",
              }),
              s.addEventListener("click", () => {
                s.style.display = "none";
              });
            let T = document.createElement("div");
            Object.assign(T.style, {
              height: "100%",
              width: "75%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }),
              s.appendChild(T);
            let u = document.createElement("div");
            Object.assign(u.style, {
              width: "100%",
              maxHeight: "50%",
              overflowY: "auto",
              backgroundColor: "aliceblue",
              tableLayout: "fixed",
              color: "black",
              padding: "5px",
              borderRadius: "5px",
              fontSize: "1.1em",
            }),
              T.appendChild(u);
            let p = document.createElement("table");
            p.addEventListener("click", (S) => {
              S.stopPropagation();
            }),
              Object.assign(p.style, {
                width: "100%",
                height: "100%",
                tableLayout: "fixed",
              });
            let c = document.createElement("thead");
            c.style.borderBottom = "1px solid";
            let d = document.createElement("tbody");
            p.appendChild(c),
              p.appendChild(d),
              c.appendChild(D("Streamer")),
              c.appendChild(D("Name")),
              c.appendChild(D("Timestamp")),
              c.appendChild(D("Stored")),
              c.appendChild(D("URL")),
              c.appendChild(D("Actions"));
            let g = t.getAll();
            g.sort((S, f) => f[1].timestamp - S[1].timestamp);
            for (let [
              S,
              { humanTime: f, value: I, videoName: b, channelName: E, url: x },
            ] of g) {
              if (S === "LAST_STORED") continue;
              let y = document.createElement("tr"),
                l = document.createElement("td");
              (l.textContent = E || "-"),
                Object.assign(l.style, {
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }),
                (l.title = E || "-"),
                y.appendChild(l),
                (l = document.createElement("td")),
                (l.textContent = b || "-"),
                Object.assign(l.style, {
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }),
                (l.title = b || "-"),
                y.appendChild(l),
                (l = document.createElement("td")),
                (l.style.textAlign = "center"),
                (l.textContent = I.join(":")),
                y.appendChild(l),
                (l = document.createElement("td")),
                (l.textContent = f || "-"),
                Object.assign(l.style, {
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }),
                (l.title = f || "-"),
                y.appendChild(l),
                (l = document.createElement("td"));
              let A = document.createElement("a");
              (A.href = x || "-"),
                (A.textContent = x || "-"),
                Object.assign(l.style, {
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }),
                (l.title = x || "-"),
                l.appendChild(A),
                y.appendChild(l),
                (l = document.createElement("td")),
                (l.style.textAlign = "right");
              let R = document.createElement("button");
              R.addEventListener("click", () => {
                t.delete(S),
                  (y.style.display = "none"),
                  o?.log(`Removed stored valued ${S}`);
              }),
                (R.textContent = "DELETE"),
                l.appendChild(R),
                y.appendChild(l),
                d.appendChild(y);
            }
            u.appendChild(p), document.body.appendChild(s);
          } catch (s) {
            o?.error("Error while creating dialog", s);
          }
        },
        h = () => {
          C();
          let s = document.createElement("div");
          (s.id = n), (s.style.cssText = "background: black; z-index: 1000;");
          let T = document.createElement("dl");
          function u(f, I) {
            let b = document.createElement("dt"),
              E = document.createElement("dd");
            return (
              (b.textContent = f),
              (E.textContent = I),
              (E.style.marginLeft = "2em"),
              (E.style.fontWeight = "bolder"),
              [b, E]
            );
          }
          let { value: p } = t.get("LAST_STORED") || {},
            c = r.getVideoId(location),
            d = r.getTime(document),
            g = {
              VIDEO_ID: c,
              STREAMER: r.getChannel(document),
              TIME: d,
              STREAM_NAME: r.getVideoName(document),
              URL: d ? a.getTimedUrl(c, d[0], d[1], d[2]) : null,
              LAST_STORED: p,
            };
          Object.entries(g)
            .map(([f, I]) => u(f, I))
            .flat()
            .forEach((f) => T.appendChild(f)),
            s.appendChild(T),
            document.body.appendChild(s),
            o?.log("Showing debug dialog"),
            (m = i.set(h, 1e3));
        };
      function C() {
        let s = document.getElementById(n);
        return s && s.parentElement ? (s.parentElement.removeChild(s), !0) : !1;
      }
      function w() {
        i.remove(m);
      }
      return {
        removeDialogIfPresent: C,
        createDialog: v,
        createDebug: h,
        clearDebugTimeout: w,
      };
    },
    P = ({ logger: e, registerMenu: t, ui: o, storage: r }) => {
      t("Dialog", () => {
        o.removeDialogIfPresent(), o.createDialog();
      }),
        t("Debug", () => {
          if ((o.clearDebugTimeout(), o.removeDialogIfPresent())) {
            e?.log("Closing debug dialog");
            return;
          }
          o.createDebug();
        }),
        t("Dump stored values", () => {
          let a = r.getAll();
          a.sort((i, n) => n[1].timestamp - i[1].timestamp),
            e?.log(`
${JSON.stringify(a, null, 2)}`);
        }),
        t("Nuke DB", () => {
          r.clear(), e?.log("Removed all entries");
        }),
        e?.log("Registered UI");
    };
  var k = ({
    logger: e,
    parser: t,
    urlTool: o,
    storage: r,
    document: a,
    cache: i,
    constants: n,
    timeouts: m,
  }) => {
    let { INTERVAL_UPDATE_TIME: v } = n,
      h = 1;
    function C({
      fnGetTime: s,
      fnGetStreamName: T,
      fnGetStreamerName: u,
      fnSetStored: p,
      fnGetTimedVodUrl: c,
      id: d,
    }) {
      try {
        e?.log(`Running ${h++}`);
        let g = T(),
          S = u();
        if (!g || !S) return e?.warn("Could not fetch VOD information");
        let f = s();
        if (!f) return e?.warn("Could not fetch time information");
        let [I, b, E] = f;
        if (I === 0 && b < 1) return e?.log("Not storing anything yet");
        let x = Date.now();
        p(d, {
          timestamp: x,
          humanTime: new Date(x).toISOString(),
          value: f,
          videoName: g,
          channelName: S,
          url: c(d, I, b, E),
        });
        let y = f.join(":");
        e?.log(`Saved ${y} for ${d}`),
          r.set("LAST_STORED", { timestamp: Date.now(), value: y });
      } catch (g) {
        e?.error("Error running interval", g);
      }
    }
    function w() {
      e?.log("Starting update interval");
      let s = t.getVideoId(location);
      if (!s || isNaN(Number(s))) return e?.error("Could not get video ID");
      let T = () => t.getTime(a),
        u = i(() => {
          let g = t.getVideoName(a);
          return e?.log(`Got current stream name: '${g}'`), g;
        }),
        p = _(() => {
          let g = t.getChannel(a);
          return e?.log(`Got current streamer: '${g}'`), g;
        }),
        c = C.bind(null, {
          fnGetStreamName: u,
          fnGetStreamerName: p,
          fnSetStored: r.set,
          fnGetTime: T,
          fnGetTimedVodUrl: o.getTimedUrl,
          id: s,
        }),
        d = m.setInterval(c, v);
      return (
        e?.log(`Starting interval ${d}`),
        {
          cancel: () => {
            e?.log(`Cancelling interval ${d}`), m.remove(d);
          },
        }
      );
    }
    return { start: w };
  };
  function $() {
    let e,
      t = N(),
      o = G({ constants: t }),
      r = { constants: t, logger: o },
      a = _,
      i = window.document,
      n = U(r),
      m = O(),
      v = V({ ...r, getValue: GM_getValue, setValue: GM_setValue }),
      h = L(r),
      C = k({
        ...r,
        cache: a,
        document: i,
        parser: n,
        storage: v,
        urlTool: m,
        timeouts: h,
      }),
      w = M({
        constants: t,
        parser: n,
        storage: v,
        timeouts: h,
        urlTool: m,
        logger: o,
      });
    o?.log("Initializing");
    function s() {
      o?.log("Matching URL");
      let T = location.pathname;
      T.startsWith("/videos")
        ? e ||
          (o?.log(
            `Current pathname '${T}' matches Twitch video portal, starting tracking`
          ),
          (e = C.start()))
        : e && (e.cancel(), (e = null));
    }
    v.purge(),
      s(),
      h.setInterval(s, t.INTERVAL_MATCH_URL),
      P({
        constants: t,
        logger: o,
        storage: v,
        registerMenu: GM_registerMenuCommand,
        ui: w,
      });
  }
  window.addEventListener("load", () => {
    $();
  });
})();
