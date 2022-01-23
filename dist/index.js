"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
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
    (0, main_1.main)();
});
