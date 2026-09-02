import { spawn } from "node:child_process";

import { PRODUCTION_BROWSER_CONFIG as config } from "./production-browser.config.mjs";

async function storePromptedValue(service, label) {
  console.log(`${label}を入力してください。値は表示されず、macOS Keychainだけに保存されます。`);
  const process = spawn("security", [
    "add-generic-password",
    "-U",
    "-a",
    config.keychainAccount,
    "-s",
    service,
    "-w",
  ], {
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    process.once("error", reject);
    process.once("exit", resolve);
  });
  if (exitCode !== 0) throw new Error(`Keychain update failed for ${label}`);
}

if (!config.auth.usernameService || !config.auth.passwordService) {
  throw new Error(`${config.id}: application-login Keychain services are not configured`);
}
await storePromptedValue(config.auth.usernameService, `${config.id} のアプリログインユーザー名`);
await storePromptedValue(config.auth.passwordService, `${config.id} のアプリログインパスワード`);
console.log(`${config.id}: application-login credentials stored in macOS Keychain`);
