# @jasonliggi/logger

Minimal, zero-dep TypeScript logger with:
- Simple instance API (`new Logger({ context?, enabled? })`)
- Dynamic enable/disable via flags (localStorage in browser, env in Node)
- Log methods (`debug|info|warn|error`) and grouping
- Browser CSS labels; plain output on server

## Install

Add to your workspace (publish or use via local path). Build with `tsc`.

## Quick Start

```ts
import Logger from "@jasonliggi/logger";

// In dev: logs are on by default.
// In prod: enable dynamically via flags.
// Browser: localStorage.LOGS_ENABLED = "true" (or DISABLE_LOGS = "true" to hard-off)
// Node:    LOGS_ENABLED=true (or DISABLE_LOGS=true)

const log = new Logger({ context: "web:testing" });
log.info("hello", { foo: 42 });
log.debug("more details");

// Instance override
const quiet = new Logger({ context: "quiet", enabled: false });
quiet.info("won't print");
```

## ESM Only

This package is ESM-only. In CommonJS, use dynamic import:

```js
// CommonJS example
(async () => {
  const { default: Logger } = await import('@jasonliggi/logger');
  const log = new Logger({ context: 'web:testing' });
  log.info('hello from CJS');
})();
```

## API

- `new Logger({ context?, enabled? })`
  - `context`: optional string label (e.g., component name)
  - `enabled`: optional boolean to force on/off for this instance
- Methods: `debug(msg, ...args)`, `info(msg, ...args)`, `warn(msg, ...args)`, `error(msg, ...args)`
- `group(label, fn, collapsed=true, level='info')`

## Dynamic Enable Flags

- Context filters (enable specific contexts):
  - Browser: set `localStorage.DEBUG = "app:*,-app:noise"` (or `localStorage.LOGS = "..."`)
  - Node/SSR: set `DEBUG="app:*,-app:noise"` (or `LOGS="..."`)
  - Semantics: comma/space‑separated patterns; `*` wildcard; `-` to exclude. If any includes are set, only included contexts log (minus excludes).
- Global on/off:
  - Enable globally: `localStorage.LOGS_ENABLED = "true"` (or `LOGS_ENABLED=true` in env)
  - Hard off: `localStorage.DISABLE_LOGS = "true"` (or `DISABLE_LOGS=true`)
- Default: on in non‑production (`NODE_ENV !== 'production'`), off in production unless enabled by flags above.

## Grouping

```ts
log.group("Compute things", () => {
  log.info("step 1");
  log.warn("step 2");
}, true, "info");
```

## Notes
- No PII redaction is performed; avoid logging secrets.

## License
MIT © Jason Liggi

## Scripts
- Build library: `pnpm build` (or `yarn build` / `npm run build`)
- Run example: `pnpm run example:all`
```
