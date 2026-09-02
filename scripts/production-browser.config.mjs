export const PRODUCTION_BROWSER_CONFIG = Object.freeze({
  id: "voxcel-city",
  origin: "https://voxcel-city.acertak.app",
  keychainAccount: "codex-voxcel-city-production-browser",
  auth: Object.freeze({
    kind: "application",
    loginPathPrefix: "/login",
    usernameService: "codex.voxcel-city.production-browser.app.username",
    passwordService: "codex.voxcel-city.production-browser.app.password",
  }),
  expectedTitle: "Block City Life",
  readySelector: "#app",
  boundary: Object.freeze({ status: 302, locationPathPrefix: "/login" }),
});
