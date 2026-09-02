# Repository agent instructions

## Production browser verification

- Production application-login credentials are already stored in this repository's own macOS Keychain entries. The runner reads them automatically and sends them only to the exact origin configured in `scripts/production-browser.config.mjs`.
- After a production-affecting change is deployed, run `npm run verify:production:browser` from this repository root. The runner logs in from Keychain without reusing a browser session or requiring `--authorize`.
- A successful run must reach and verify the authenticated application view. `npm run verify:production:browser -- --boundaries` checks only the unauthenticated rejection boundary and is not a substitute for the normal run.
- Never print, copy, or place credential values in source files, environment variables, command arguments, chat, screenshots, or logs. Never manually reuse another repository's Keychain entries.
- Do not delete Keychain items or rerun setup merely to bypass an authentication failure. If an item cannot be read, stop and report the failure, then follow `PRODUCTION_BROWSER.md`.
- See `PRODUCTION_BROWSER.md` for the complete verification and recovery procedure.
