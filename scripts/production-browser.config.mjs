export const PRODUCTION_BROWSER_CONFIG = Object.freeze({
  id: "voxcel-city",
  origin: "https://voxcel-city.acertak.app",
  keychainAccount: "codex-voxcel-city-production-browser",
  auth: Object.freeze({
    kind: "basic",
    usernameService: "codex.voxcel-city.production-browser.basic.username",
    passwordService: "codex.voxcel-city.production-browser.basic.password",
  }),
  expectedTitle: "Block City Life",
  readySelector: "#app",
  boundary: Object.freeze({"status":401}),
});
