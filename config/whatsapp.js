const isProduction =
  process.env.NODE_ENV === "production";

const getPuppeteerArgs = () => {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gl-drawing-for-tests",
  ];

  if (isProduction) {
    return [
      ...commonArgs,
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-default-apps",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-field-trial-config",
      "--disable-back-forward-cache",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-sync",
      "--disable-translate",
      "--disable-windows10-custom-titlebar",
      "--disable-component-extensions-with-background-pages",
      "--disable-client-side-phishing-detection",
      "--disable-sync-preferences",
      "--disable-speech-api",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-pings",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-blink-features=AutomationControlled",
    ];
  }
  
  return commonArgs;
};

const MAX_RESTART_ATTEMPTS = 5;

module.exports = {
  isProduction,
  getPuppeteerArgs,
  MAX_RESTART_ATTEMPTS,
};
