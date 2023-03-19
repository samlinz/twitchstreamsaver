import { buildTwitchVariant } from "./twitch";
import { buildYoutubeVariant } from "./youtube";

export function main() {
  const host = location.host;

  // Find out which video service we are actually using.
  if (host.includes("twitch")) {
    buildTwitchVariant().init();
  } else if (host.includes("youtube")) {
    buildYoutubeVariant().init();
  } else {
    throw Error(`${host} didn't match any known portal`);
  }
}
