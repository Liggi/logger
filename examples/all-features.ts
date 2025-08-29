// Example: Minimal Logger usage (TypeScript, ESM)
//
// Run:
//   npm run example:all
//
// This imports the package name via a path alias (tsconfig.examples.json)

import Logger from "@jasonliggi/logger";

// Create instances and start logging immediately (default: on in dev, off in prod unless enabled via flags)
const app = new Logger({ context: "app:core" });
const noise = new Logger({ context: "app:noise" });
const svc = new Logger({ context: "svc:beta" });

type Payload = { version: number; ok: boolean };
const payload: Payload = { version: 1, ok: true };

console.log("\n=== Basic logs (all enabled, level=debug) ===");
app.info("hello from app", payload);
app.debug("debug detail", { details: [1, 2, 3] });
noise.debug("this is noisy");
svc.info("svc info shows");

console.log("\n=== Grouping (level=info, expanded) ===");
app.group("Compute things", () => {
  app.info("step 1");
  app.warn("step 2 needs attention");
}, false, "info");

console.log("\n=== Dynamic enable via flags ===");
console.log("Set LOGS_ENABLED=true (localStorage/env) to enable in prod; DISABLE_LOGS=true to hard-off.");
app.info("still logging if enabled");
noise.debug("still logging if enabled");
svc.info("svc still logging if enabled");

console.log("\n=== Context filters (DEBUG patterns) ===");
// Simulate env-based context filters (no Node types required)
// Enable only app:* and svc:beta, but exclude app:noise
(globalThis as any).process && ((globalThis as any).process.env.DEBUG = "app:*,-app:noise,svc:beta");
app.info("app still enabled via DEBUG");
noise.debug("should NOT show due to exclude");
svc.info("svc still enabled via DEBUG");

console.log("\n=== Instance override ===");
const off = new Logger({ context: "off", enabled: false });
off.info("no output expected");
const on = new Logger({ context: "on", enabled: true });
on.info("forced on via instance");

console.log("\nDone.\n");
