# Production browser verification

This repository verifies its own Cloudflare production deployment independently.
It does not import scripts, dependencies, credentials, or browser state from any
sibling repository.

- Production origin: `https://voxcel-city.acertak.app`
- Authentication: branded application login with a signed HttpOnly cookie
- Chrome profile: `~/.codex/browser-profiles/voxcel-city-production/`
- Results: `~/.codex/production-browser-results/voxcel-city/`

Check the unauthenticated boundary without credentials:

```bash
npm run verify:production:browser -- --boundaries
```

Initialize authentication once:

```bash
npm run verify:production:browser:setup
```

The Application-login setup command prompts securely and stores values only in macOS
Keychain. The normal verifier posts them only to this repository's exact `/login`
origin and does not require an existing browser session. No credential value belongs
in this repository, a command line, or chat.

After initialization, run the normal headless production check:

```bash
npm run verify:production:browser
```

The verifier loads the real production origin, checks the project-specific root
and title, waits for a stability interval, rejects same-origin request failures,
HTTP 5xx, uncaught exceptions, and console errors, then stores a full-page
screenshot. It does not create accounts or perform application mutations.
