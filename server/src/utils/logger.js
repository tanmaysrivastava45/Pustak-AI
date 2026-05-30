export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, err = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err ? err.stack || err : '');
  },
  debug: (msg, meta = {}) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
    }
  },
};
