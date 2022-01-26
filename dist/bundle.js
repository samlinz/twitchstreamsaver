
// ==UserScript==
// @name        Video Saver
// @namespace   samlinz
// @match       https://www.twitch.tv/*
// @match       https://www.youtube.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @icon https://static.twitchcdn.net/assets/favicon-32-d6025c14e900565d6177.png
// @version     26
// @author      samlinz
// @description 9/21/2020, 1:20:46 PM
// ==/UserScript==

(()=>{var A=()=>{let e=1,t=10*1e3,o=10*1e3,i=30,s=!0,n="STREAM_SAVER: ",r=`stored_values_ver_${e}`;return{MAJOR_VER:e,INTERVAL_MATCH_URL:o,DIALOG_DOM_ID:"stream-saver-dialog",STORAGE_KEY:r,INTERVAL_UPDATE_TIME:t,LOGGING:s,LOG_PREFIX:n,MAX_AGE_DAYS:i,DEBUG:!0}};var P=()=>({getTimedUrl:(t,o)=>{let[i,s,n]=o,r=(i||0)*3600+(s||0)*60+n;return`https://youtu.be/${t}?t=${r}`}}),M=()=>({getTimedUrl:(t,o)=>{let[i,s,n]=o;return`https://www.twitch.tv/videos/${t}?t=${i}h${s}m${n}s`}}),_=e=>{let t=5*60*1e3,o,i;function s(){if(Date.now()<i+t)return o;let n=e();return i=Date.now(),o=n,o}return s},O=({constants:e})=>{let{LOGGING:t,LOG_PREFIX:o}=e;function i(...r){!t||console.error(o,...r)}function s(...r){!t||console.log(o,...r)}function n(...r){!t||console.warn(o,...r)}return{error:i,log:s,warn:n}},G=({constants:e})=>({set:(s,n)=>window.setTimeout(s,n),setInterval:(s,n)=>window.setInterval(s,n),remove:s=>clearTimeout(s)});var $=({logger:e})=>{function t(n){return new URL(n.href).searchParams.get("v")}function o(n){let a=n.querySelector(".ytp-time-current")?.textContent?.split(":").map(f=>Number(f))||null;return a?a?.length<3?[0,a[0],a[1]]:[a[0],a[1],a[2]]:null}function i(n){return n.querySelector("ytd-video-owner-renderer")?.querySelector(".yt-formatted-string")?.textContent||null}function s(n){return n.title.split("- YouTube")[0].trim()}return{getVideoId:t,getTime:o,getVideoName:s,getChannel:i}},k=({logger:e})=>{function t(n){let r=n.pathname.split("/");return r[r.length-1]}function o(n){let r=n.querySelector(".vod-seekbar-time-labels [data-a-target='player-seekbar-current-time']");return!r||!r.textContent?null:r.textContent.split(":").map(a=>Number(a))}function i(n){let r=n.querySelector("[data-a-target='player-info-title'] > a");if(!r){let a=n.title.split("-");return a.length<2?null:a[0].trim()}return r.textContent}function s(n){let r=n.querySelector(".stream-info-card [data-test-selector='stream-info-card-component__subtitle']");return r?r.textContent:(r=n.querySelector("[data-a-target='stream-title']"),!r||!r.textContent?null:r.textContent.split("\u2022")[0])}return{getVideoId:t,getTime:o,getVideoName:s,getChannel:i}};var U=({constants:e,logger:t,getValue:o,setValue:i,variant:s})=>{let{STORAGE_KEY:n,MAX_AGE_DAYS:r}=e,a=`${n}_${s}`,f={},h=()=>o(a,f),w=m=>h()[m],I=()=>Object.entries(h()),c=(m,u)=>{let d=h();if(!d)throw Error("Null storage");d[m]=u,i(a,d)},p=m=>{let u=h(),{[m]:d,...S}=u;return i(a,S),!!d};return{set:c,get:w,getAll:I,delete:p,clear:()=>i(a,{}),purge:()=>{for(let[m,{timestamp:u}]of I()){if(!u){t?.error(`Invalid timestamp for ${m}`);continue}let d=Date.now()-u,S=r*24*60*60*1e3;d>S&&p(m)&&t?.log(`Removed old stored value ${m}`)}},import:m=>{if(!m)throw Error("Null storage");i(a,m)},export:()=>o(a,f)}};function R(e){let t=document.createElement("th");return t.textContent=e,t}var N=({constants:e,storage:t,logger:o,parser:i,urlTool:s,timeouts:n})=>{let{DIALOG_DOM_ID:r}=e,a,f=()=>{try{o?.log("Showing dialog");let c=document.createElement("div");c.id=r,Object.assign(c.style,{width:"100%",height:"100vh",backgroundColor:"rgba(0, 0, 0, 0.5)",position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:1e4,display:"flex",justifyContent:"center"}),c.addEventListener("click",()=>{c.style.display="none"});let p=document.createElement("div");Object.assign(p.style,{height:"100%",width:"75%",display:"flex",flexDirection:"column",justifyContent:"center"}),c.appendChild(p);let T=document.createElement("div");Object.assign(T.style,{width:"100%",maxHeight:"50%",overflowY:"auto",backgroundColor:"aliceblue",tableLayout:"fixed",color:"black",padding:"5px",borderRadius:"5px",fontSize:"1.1em"}),p.appendChild(T);let v=document.createElement("table");v.addEventListener("click",u=>{u.stopPropagation()}),Object.assign(v.style,{width:"100%",height:"100%",tableLayout:"fixed"});let g=document.createElement("thead");g.style.borderBottom="1px solid";let y=document.createElement("tbody");v.appendChild(g),v.appendChild(y),g.appendChild(R("Streamer")),g.appendChild(R("Name")),g.appendChild(R("Timestamp")),g.appendChild(R("Stored")),g.appendChild(R("URL")),g.appendChild(R("Actions"));let m=t.getAll();m.sort((u,d)=>d[1].timestamp-u[1].timestamp);for(let[u,{humanTime:d,value:S,videoName:E,channelName:b,url:x}]of m){if(u==="LAST_STORED")continue;let C=document.createElement("tr"),l=document.createElement("td");l.textContent=b||"-",Object.assign(l.style,{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}),l.title=b||"-",C.appendChild(l),l=document.createElement("td"),l.textContent=E||"-",Object.assign(l.style,{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}),l.title=E||"-",C.appendChild(l),l=document.createElement("td"),l.style.textAlign="center",l.textContent=S.join(":"),C.appendChild(l),l=document.createElement("td"),l.textContent=d||"-",Object.assign(l.style,{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}),l.title=d||"-",C.appendChild(l),l=document.createElement("td");let V=document.createElement("a");V.href=x||"-",V.textContent=x||"-",Object.assign(l.style,{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}),l.title=x||"-",l.appendChild(V),C.appendChild(l),l=document.createElement("td"),l.style.textAlign="right";let D=document.createElement("button");D.addEventListener("click",()=>{t.delete(u),C.style.display="none",o?.log(`Removed stored valued ${u}`)}),D.textContent="DELETE",l.appendChild(D),C.appendChild(l),y.appendChild(C)}T.appendChild(v),document.body.appendChild(c)}catch(c){o?.error("Error while creating dialog",c)}},h=()=>{w();let c=document.createElement("div");c.id=r,c.style.cssText="background: black; color: white; z-index: 9999; position: absolute; top: 0; left: 0;";let p=document.createElement("dl");function T(d,S){let E=document.createElement("dt"),b=document.createElement("dd");return E.textContent=d,b.textContent=S,b.style.marginLeft="2em",b.style.fontWeight="bolder",[E,b]}let{value:v}=t.get("LAST_STORED")||{},g=i.getVideoId(location),y=i.getTime(document),m={VIDEO_ID:g,STREAMER:i.getChannel(document),TIME:y,STREAM_NAME:i.getVideoName(document),URL:y&&g?s.getTimedUrl(g,y):null,LAST_STORED:v};Object.entries(m).map(([d,S])=>T(d,S)).flat().forEach(d=>p.appendChild(d)),c.appendChild(p),document.body.appendChild(c),o?.log("Showing debug dialog"),a=n.set(h,1e3)};function w(){let c=document.getElementById(r);return c&&c.parentElement?(c.parentElement.removeChild(c),!0):!1}function I(){n.remove(a)}return{removeDialogIfPresent:w,createDialog:f,createDebug:h,clearDebugTimeout:I}},L=({logger:e,registerMenu:t,ui:o,storage:i,onStoreValue:s})=>{s&&t("Store timestamp",s),t("Dialog",()=>{o.clearDebugTimeout(),o.removeDialogIfPresent(),o.createDialog()}),t("Debug",()=>{if(o.clearDebugTimeout(),o.removeDialogIfPresent()){e?.log("Closing debug dialog");return}o.createDebug()}),t("Dump stored values",()=>{let n=i.getAll();n.sort((r,a)=>a[1].timestamp-r[1].timestamp),e?.log(`
${JSON.stringify(n,null,2)}`)}),t("Nuke DB",()=>{i.clear(),e?.log("Removed all entries")}),t("Export DB",()=>{let n=i.export();e?.log({export:n})}),t("Import DB",()=>{let n=window.prompt("Add db dump"),r=JSON.parse(n);i.import(r),e?.log("Imported DB")}),e?.log("Registered UI")};var j=({logger:e,parser:t,urlTool:o,storage:i,document:s,cache:n,constants:r,timeouts:a})=>{let{INTERVAL_UPDATE_TIME:f}=r,h=1;function w({fnGetTime:p,fnGetStreamName:T,fnGetStreamerName:v,fnSetStored:g,fnGetTimedVodUrl:y,options:m,id:u}){try{e?.log(`Running ${h++}`);let d=T(),S=v();if(!d||!S)return e?.warn("Could not fetch VOD information");let E=p();if(!E)return e?.warn("Could not fetch time information");let[b,x,C]=E;if(m.skipStartOfVideo&&b===0&&x<1)return e?.log("Not storing anything yet");let l=Date.now(),V=y(u,[b,x,C]);g(u,{timestamp:l,humanTime:new Date(l).toISOString(),value:E,videoName:d,channelName:S,url:V});let D=E.join(":");e?.log(`Saved ${D} for ${u}`),r.DEBUG&&e?.log({streamName:d,streamerName:S,time:E,hours:b,minutes:x,seconds:C,timestamp:l,vodUrl:V,storedTimeStr:D}),i.set("LAST_STORED",{timestamp:Date.now(),value:D})}catch(d){e?.error("Error running interval",d)}}let I=({skipStartOfVideo:p=!1}={})=>{let T=t.getVideoId(location);if(!T)return e?.error("Could not get video ID");let v=()=>t.getTime(s),g=n(()=>{let u=t.getVideoName(s);return e?.log(`Got current stream name: '${u}'`),u}),y=_(()=>{let u=t.getChannel(s);return e?.log(`Got current streamer: '${u}'`),u});return w.bind(null,{fnGetStreamName:g,fnGetStreamerName:y,fnSetStored:i.set,fnGetTime:v,fnGetTimedVodUrl:o.getTimedUrl,id:T,options:{skipStartOfVideo:p}})};function c(){e?.log("Starting update interval");let p=I({skipStartOfVideo:!0}),T=a.setInterval(p,f);return e?.log(`Starting interval ${T}`),{cancel:()=>{e?.log(`Cancelling interval ${T}`),a.remove(T)}}}return{start:c,getRunInterval:I}},Y=()=>{let e,t=A(),o=O({constants:t}),i={constants:t,logger:o},s=_,n=window.document,r=k(i),a=M(),f=U({...i,getValue:GM_getValue,setValue:GM_setValue,variant:"twitch"}),h=G(i),w=j({...i,cache:s,document:n,parser:r,storage:f,urlTool:a,timeouts:h}),I=N({constants:t,parser:r,storage:f,timeouts:h,urlTool:a,logger:o});o?.log("Initializing");function c(){o?.log("Matching URL");let p=location.pathname;p.startsWith("/videos")?e||(o?.log(`Current pathname '${p}' matches Twitch video portal, starting tracking`),e=w.start()):e&&(e.cancel(),e=null)}return{init(){f.purge(),c(),h.setInterval(c,t.INTERVAL_MATCH_URL),L({constants:t,logger:o,storage:f,registerMenu:GM_registerMenuCommand,ui:I})}}},K=()=>{let e=A(),t=O({constants:e}),o={constants:e,logger:t},i=_,s=window.document,n=$(o),r=P(),a=U({...o,getValue:GM_getValue,setValue:GM_setValue,variant:"youtube"}),f=G(o),h=j({...o,cache:i,document:s,parser:n,storage:a,urlTool:r,timeouts:f}),w=N({constants:e,parser:n,storage:a,timeouts:f,urlTool:r,logger:t});return t?.log("Initializing"),{init(){a.purge(),L({constants:e,logger:t,storage:a,registerMenu:GM_registerMenuCommand,ui:w,onStoreValue:()=>{t.log("Running interval manually"),h.getRunInterval({skipStartOfVideo:!1})?.()}})}}};function B(){let e=location.host;if(e.includes("twitch"))Y().init();else if(e.includes("youtube"))K().init();else throw Error(`${e} didn't match any known portal`)}window.addEventListener("load",()=>{B()});})();
