import { main } from "./main";

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

window.addEventListener("load", () => {
  main();
});
