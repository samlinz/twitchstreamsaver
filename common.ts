import { Constants } from "./constants";

export type StorageEntry = {
  timestamp: number;
  humanTime: string;
  value: any;
  videoName: string;
  channelName: string;
  url: string;
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
