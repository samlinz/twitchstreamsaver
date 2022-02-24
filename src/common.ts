import { Constants } from "./constants";

export type StorageEntry = {
  timestamp: number;
  humanTime?: string;
  value?: any;
  videoName?: string;
  channelName?: string;
  url?: string;
};

export type Log = typeof console["log"];
export type Logger = {
  log: Log;
  error: Log;
  warn: Log;
};

export type Services = {
  logger?: Logger;
  constants: Constants;
};

export const sortByProp =
  <T>(prop: keyof T) =>
  (a: T, b: T) => {
    const x1 = a[prop];
    const x2 = b[prop];
    if (x1 === x2) return 0;
    if (x1 > x2) return 1;
    return -1;
  };
