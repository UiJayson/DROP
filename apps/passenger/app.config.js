const appJson = require('./app.json');

/** GitHub Pages serves this repo at /DROP/. Leave unset for local web and native. */
function pagesBase() {
  const raw = process.env.DROP_WEB_BASE?.trim() ?? '';
  if (!raw || raw === '/') {
    return '';
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, '');
}

module.exports = () => {
  const baseUrl = pagesBase();
  return {
    expo: {
      ...appJson.expo,
      experiments: {
        ...appJson.expo.experiments,
        ...(baseUrl ? { baseUrl } : {}),
      },
    },
  };
};
