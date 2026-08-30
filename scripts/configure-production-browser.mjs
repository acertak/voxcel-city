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

if (config.auth.kind !== "basic") {
  console.log(`${config.id}: Basic認証は使用しません。--authorizeで対話ログインしてください。`);
} else {
  await storePromptedValue(config.auth.usernameService, `${config.id} のBasic認証ユーザー名`);
  await storePromptedValue(config.auth.passwordService, `${config.id} のBasic認証パスワード`);
  console.log(`${config.id}: Basic credentials stored in macOS Keychain`);
}
