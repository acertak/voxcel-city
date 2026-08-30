import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { chromium } from "playwright";

import { PRODUCTION_BROWSER_CONFIG as config } from "./production-browser.config.mjs";

const execFileAsync = promisify(execFile);
const profileRoot = process.env.PRODUCTION_BROWSER_PROFILE_ROOT ??
  join(homedir(), ".codex", "browser-profiles", `${config.id}-production`);
const resultRoot = process.env.PRODUCTION_BROWSER_RESULT_ROOT ??
  join(homedir(), ".codex", "production-browser-results", config.id);

function parsePositiveInteger(value, label) {
  if (!/^[1-9]\d*$/u.test(value)) throw new TypeError(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new RangeError(`${label} is too large`);
  return parsed;
}

function parseOptions(argv) {
  const options = {
    authorize: false,
    boundaryOnly: false,
    headed: false,
    stabilityMs: 3_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--authorize":
        options.authorize = true;
        options.headed = true;
        break;
      case "--boundaries":
        options.boundaryOnly = true;
        break;
      case "--headed":
        options.headed = true;
        break;
      case "--stability-ms": {
        const value = argv[index + 1];
        if (!value) throw new TypeError("--stability-ms requires a value");
        options.stabilityMs = parsePositiveInteger(value, "--stability-ms");
        index += 1;
        break;
      }
      default:
        throw new TypeError(`unsupported argument: ${argument}`);
    }
  }
  return options;
}

async function readKeychain(service) {
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-a",
      config.keychainAccount,
      "-s",
      service,
      "-w",
    ], { encoding: "utf8", maxBuffer: 64 * 1024 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function basicCredentials() {
  if (config.auth.kind !== "basic") return undefined;
  const username = process.env.PRODUCTION_BROWSER_BASIC_USERNAME?.trim() ||
    await readKeychain(config.auth.usernameService);
  const password = process.env.PRODUCTION_BROWSER_BASIC_PASSWORD?.trim() ||
    await readKeychain(config.auth.passwordService);
  if (!username || !password) {
    throw new Error(
      `${config.id}: Basic credentials are missing. ` +
      "Run the repository's verify:production:browser:setup command.",
    );
  }
  return { username, password };
}

function accessLoginUrl(value) {
  try {
    return new URL(value).hostname.endsWith(".cloudflareaccess.com");
  } catch {
    return false;
  }
}

function sameOrigin(value) {
  try {
    return new URL(value).origin === config.origin;
  } catch {
    return false;
  }
}

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
}

async function waitForInteractiveAuthorization(page) {
  console.log(`${config.id}: Chromeで認証を完了してください（最大10分待機します）`);
  await page.waitForURL(
    (url) => url.origin === config.origin && (
      config.auth.kind !== "application" ||
      !url.pathname.startsWith(config.auth.loginPathPrefix)
    ),
    { timeout: 10 * 60_000, waitUntil: "domcontentloaded" },
  );
}

async function requireApplicationSession(page, authorize) {
  const finalUrl = new URL(page.url());
  const onAccessLogin = accessLoginUrl(finalUrl.href);
  const onApplicationLogin = config.auth.kind === "application" &&
    finalUrl.origin === config.origin &&
    finalUrl.pathname.startsWith(config.auth.loginPathPrefix);

  if (onAccessLogin || onApplicationLogin) {
    if (!authorize) {
      throw new Error(
        `${config.id}: interactive authorization is required. ` +
        "Run verify:production:browser with --authorize.",
      );
    }
    await waitForInteractiveAuthorization(page);
  }

  await page.locator(config.readySelector).first().waitFor({
    state: "visible",
    timeout: 60_000,
  });

  if (config.authenticatedSelector) {
    const authenticated = page.locator(config.authenticatedSelector).first();
    if (!(await authenticated.isVisible())) {
      if (!authorize) {
        throw new Error(
          `${config.id}: the application session is not authenticated. ` +
          "Run verify:production:browser with --authorize.",
        );
      }
      console.log(`${config.id}: アプリ内ログインを完了してください（最大10分待機します）`);
      await authenticated.waitFor({ state: "visible", timeout: 10 * 60_000 });
    }
  }
}

async function verifyBoundary() {
  const response = await fetch(config.origin, { redirect: "manual" });
  const location = response.headers.get("Location");
  if (response.status !== config.boundary.status) {
    throw new Error(
      `${config.id}: expected unauthenticated ${config.boundary.status}, got ${response.status}`,
    );
  }
  if (config.boundary.locationHost) {
    if (!location || new URL(location, config.origin).hostname !== config.boundary.locationHost) {
      throw new Error(`${config.id}: unexpected Access redirect ${JSON.stringify(location)}`);
    }
  }
  if (config.boundary.locationPathPrefix) {
    if (!location || !new URL(location, config.origin).pathname.startsWith(config.boundary.locationPathPrefix)) {
      throw new Error(`${config.id}: unexpected application redirect ${JSON.stringify(location)}`);
    }
  }
  console.log(JSON.stringify({
    ok: true,
    id: config.id,
    origin: config.origin,
    status: response.status,
    location: location ? new URL(location, config.origin).origin + new URL(location, config.origin).pathname : null,
  }));
}

async function verifyBrowser(options) {
  const startedAt = Date.now();
  const httpCredentials = await basicCredentials();
  await ensureDirectory(profileRoot);
  const runDirectory = join(resultRoot, new Date().toISOString().replace(/[:.]/gu, "-"));
  await ensureDirectory(runDirectory);

  let context = null;
  try {
    context = await chromium.launchPersistentContext(profileRoot, {
      channel: "chrome",
      headless: !options.headed,
      httpCredentials,
      viewport: { width: 1440, height: 900 },
    });
    const page = context.pages()[0] ?? await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    const serverErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      if (sameOrigin(request.url())) {
        requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
      }
    });
    page.on("response", (response) => {
      if (sameOrigin(response.url()) && response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    const response = await page.goto(config.origin, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (!response && sameOrigin(page.url())) {
      throw new Error(`${config.id}: navigation returned no response`);
    }
    await requireApplicationSession(page, options.authorize);
    await page.waitForTimeout(options.stabilityMs);

    const title = await page.title();
    if (config.expectedTitle && !title.includes(config.expectedTitle)) {
      throw new Error(
        `${config.id}: expected title containing ${JSON.stringify(config.expectedTitle)}, ` +
        `got ${JSON.stringify(title)}`,
      );
    }
    if (!(await page.locator("body").innerText()).trim()) {
      throw new Error(`${config.id}: production page body is empty`);
    }

    const screenshot = join(runDirectory, `${config.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const failures = [
      ...consoleErrors.map((value) => `console: ${value}`),
      ...pageErrors.map((value) => `pageerror: ${value}`),
      ...requestFailures.map((value) => `requestfailed: ${value}`),
      ...serverErrors.map((value) => `server: ${value}`),
    ];
    if (failures.length > 0) {
      throw new Error(`${config.id}: browser errors detected\n${failures.join("\n")}`);
    }
    console.log(JSON.stringify({
      ok: true,
      id: config.id,
      origin: config.origin,
      finalUrl: page.url(),
      title,
      durationMs: Date.now() - startedAt,
      screenshot,
    }));
  } finally {
    await context?.close().catch(() => undefined);
  }
}

const options = parseOptions(process.argv.slice(2));
if (options.boundaryOnly) await verifyBoundary();
else await verifyBrowser(options);
