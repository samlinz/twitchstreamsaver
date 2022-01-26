export type Constants = ReturnType<typeof getConstants>;
export const getConstants = () => {
  const MAJOR_VER = 1;

  // How often the state is stored.
  const INTERVAL_UPDATE_TIME = 10 * 1000;
  const INTERVAL_MATCH_URL = 10 * 1000;

  // How long the state is stored until it's cleared.
  const MAX_AGE_DAYS = 30;

  const LOGGING = true;
  const LOG_PREFIX = "STREAM_SAVER: ";

  // Internal constants.
  const STORAGE_KEY = `stored_values_ver_${MAJOR_VER}`;
  const DIALOG_DOM_ID = `stream-saver-dialog`;

  return {
    MAJOR_VER,
    INTERVAL_MATCH_URL,
    DIALOG_DOM_ID,
    STORAGE_KEY,
    INTERVAL_UPDATE_TIME,
    LOGGING,
    LOG_PREFIX,
    MAX_AGE_DAYS,
    DEBUG: false,
  };
};
