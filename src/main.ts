import { buildTwitchVariant } from "./twitch";
import { buildYoutubeVariant } from "./youtube";

export function main({ initialUrl }: { initialUrl: string }) {
  const host = location.host;

  const builderProps: ProcessVariantBuilderProps = {
    initialUrl,
  };

  // Find out which video service we are actually using.
  if (host.includes("twitch")) {
    buildTwitchVariant(builderProps).init();
  } else if (host.includes("youtube")) {
    buildYoutubeVariant(builderProps).init();
  } else {
    throw Error(`${host} didn't match any known portal`);
  }
}
