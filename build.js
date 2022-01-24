const fs = require("fs");
const path = require("path");

const USERSCRIPT_CONFIG = `
// ==UserScript==
// @name        Video Saver
// @namespace   samlinz
// @match       https://www.twitch.tv/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @icon https://static.twitchcdn.net/assets/favicon-32-d6025c14e900565d6177.png
// @version     $VERSION
// @author      samlinz
// @description 9/21/2020, 1:20:46 PM
// ==/UserScript==
`;

const outputDir = "./dist";
const outputFileName = "bundle.js";
const outputFile = path.join(outputDir, outputFileName);

const addPrepend = ({ oldVersion }) => {
  const newVersion = oldVersion + 1;
  const bundle = fs.readFileSync(outputFile);
  const newBundle = [
    USERSCRIPT_CONFIG.replace("$VERSION", newVersion),
    bundle,
  ].join("\n");
  fs.writeFileSync(outputFile, newBundle);
};

const removeTempFiles = () => {
  const files = fs.readdirSync(outputDir);
  const filesToRemove = files.filter((f) => f !== outputFileName);
  console.log("Removing", filesToRemove);
  filesToRemove.map((ftr) => path.join(outputDir, ftr)).forEach(fs.unlinkSync);
};

const onAfterBuild = ({ oldVersion }) => {
  addPrepend({ oldVersion });
  // removeTempFiles();
};

const oldVersion = (() => {
  const bundle = fs.readFileSync(outputFile);
  const match = /@version\s*(\S+)$/gim.exec(bundle);
  const oldVersion = match.length > 1 ? Number(match[1]) : null;
  if (!oldVersion) return 0;
  return oldVersion;
})();

require("esbuild")
  .build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    minify: true,
    sourcemap: false,
    outfile: outputFile,
  })
  .then(onAfterBuild.bind(null, { oldVersion }))
  .then(() => {
    console.log("Done");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
