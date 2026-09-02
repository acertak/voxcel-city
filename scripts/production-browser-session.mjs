export async function initializeAppLoginSession(context, origin, credentials) {
  let production;
  try {
    production = new URL(origin);
  } catch {
    throw new Error("The production browser origin is invalid.");
  }
  if (production.protocol !== "https:" || production.origin !== origin) {
    throw new Error("The production browser origin must be an exact HTTPS origin.");
  }
  if (
    !credentials ||
    credentials.origin !== origin ||
    typeof credentials.username !== "string" ||
    !credentials.username ||
    typeof credentials.password !== "string" ||
    !credentials.password
  ) {
    throw new Error("Origin-scoped application-login credentials are required for session login.");
  }

  let response;
  try {
    response = await context.request.post(new URL("/login", origin).href, {
      form: { username: credentials.username, password: credentials.password },
      headers: { Origin: origin, "Sec-Fetch-Site": "same-origin" },
      maxRedirects: 0,
      maxRetries: 0,
      timeout: 30_000,
    });
  } catch {
    // Request errors can contain request headers or form data. Never echo them.
    throw new Error("Session login request failed; credential details were omitted.");
  }

  try {
    if (response.status() !== 303) {
      throw new Error(`Session login returned HTTP ${response.status()}.`);
    }
    const location = response.headers().location;
    let redirect;
    try {
      if (!location) throw new Error("Missing redirect");
      redirect = new URL(location, origin);
    } catch {
      throw new Error("Session login returned an invalid redirect.");
    }
    if (redirect.origin !== origin || redirect.username || redirect.password) {
      throw new Error("Session login returned an unsafe redirect.");
    }
  } finally {
    await response.dispose().catch(() => undefined);
  }
}
