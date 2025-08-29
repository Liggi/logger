/* eslint-disable no-console */
// Minimal, instance-based logger with dynamic enablement via flags.

export interface LoggerOptions {
  // Optional context to prefix all log messages (e.g., a component or feature name)
  context?: string;

  // Explicit on/off override; if undefined, it’s computed from flags/env defaults
  enabled?: boolean;
}

function isBrowserEnv(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

const isBrowser = isBrowserEnv();

function readLocalStorage(key: string): string | undefined {
  if (!isBrowser) return undefined;
  try {
    const v = window.localStorage.getItem(key);
    return v == null ? undefined : v;
  } catch {
    return undefined;
  }
}

function readEnv(key: string): string | undefined {
  try {
    // @ts-ignore - process may be inlined or undefined in browsers
    const env = typeof process !== "undefined" ? process.env : undefined;
    // @ts-ignore
    return env ? env[key] : undefined;
  } catch {
    return undefined;
  }
}

function resolveFlag(keys: string[]): string | undefined {
  // Prefer browser localStorage, then env
  for (const k of keys) {
    const v = readLocalStorage(k);
    if (v != null) return v;
  }
  for (const k of keys) {
    const v = readEnv(k);
    if (v != null) return v;
  }
  return undefined;
}

function isTrue(v: string | undefined): boolean {
  return String(v).toLowerCase() === "true";
}

function isProd(): boolean {
  const node = readEnv("NODE_ENV");
  return node === "production";
}

// Simple debug-like pattern filtering for contexts
type CompiledFilters = { include: RegExp[]; exclude: RegExp[] };

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegex(pat: string): RegExp {
  const source = "^" + escapeRegex(pat).replace(/\\\*/g, ".*?") + "$";
  return new RegExp(source);
}

function compileFilters(raw: string | undefined | null): CompiledFilters {
  const include: RegExp[] = [];
  const exclude: RegExp[] = [];
  if (!raw) return { include, exclude };
  const parts = raw
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("-")) exclude.push(patternToRegex(part.slice(1)));
    else include.push(patternToRegex(part));
  }
  return { include, exclude };
}

function matchesContext(ctx: string, filters: CompiledFilters): boolean {
  const { include, exclude } = filters;
  if (exclude.some((rx) => rx.test(ctx))) return false;
  if (include.length === 0) return false;
  return include.some((rx) => rx.test(ctx));
}

function getStyledLabel(level: "debug" | "info" | "warn" | "error", context?: string) {
  const base = "font-weight:bold;padding:2px 4px;border-radius:2px;";
  const style = (() => {
    switch (level) {
      case "debug":
        return "background:#e0e0e0;color:#000;";
      case "info":
        return "background:#dff0d8;color:#3c763d;";
      case "warn":
        return "background:#fcf8e3;color:#8a6d3b;";
      case "error":
        return "background:#f2dede;color:#a94442;";
      default:
        return "";
    }
  })();
  const label = `[${level.toUpperCase()}]${context ? ` [${context}]` : ""}`;
  return { fmt: `%c${label}%c`, style1: base + style, style2: "" };
}

export class Logger {
  private context?: string;
  private explicitEnabled?: boolean;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context;
    this.explicitEnabled = options.enabled;
  }

  private shouldLog(): boolean {
    // Explicit instance override wins
    if (typeof this.explicitEnabled === "boolean") return this.explicitEnabled;

    // Hard off flag
    if (isTrue(resolveFlag(["DISABLE_LOGS", "NEXT_PUBLIC_DISABLE_LOGS"]))) return false;

    // Context filters from flags (prefer browser, then env)
    // Supports either DEBUG or LOGS for familiarity.
    const raw =
      resolveFlag(["DEBUG", "NEXT_PUBLIC_DEBUG"]) ??
      resolveFlag(["LOGS", "NEXT_PUBLIC_LOGS"]);
    const filters = compileFilters(raw);
    if (this.context && (filters.include.length > 0 || filters.exclude.length > 0)) {
      return matchesContext(this.context, filters);
    }

    // If no filter configured, allow a quick global enable
    const enabledFlag = resolveFlag(["LOGS_ENABLED", "NEXT_PUBLIC_LOGS_ENABLED"]);
    if (isTrue(enabledFlag)) return true;

    // Fallback: on in non-production, off in production
    return !isProd();
  }

  debug(message: string, ...args: unknown[]) {
    if (!this.shouldLog()) return;
    if (isBrowser) {
      const { fmt, style1, style2 } = getStyledLabel("debug", this.context);
      console.debug(fmt + ` ${message}`, style1, style2, ...args);
    } else {
      console.debug(`[DEBUG]${this.context ? ` [${this.context}]` : ""} ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (!this.shouldLog()) return;
    if (isBrowser) {
      const { fmt, style1, style2 } = getStyledLabel("info", this.context);
      console.info(fmt + ` ${message}`, style1, style2, ...args);
    } else {
      console.info(`[INFO]${this.context ? ` [${this.context}]` : ""} ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (!this.shouldLog()) return;
    if (isBrowser) {
      const { fmt, style1, style2 } = getStyledLabel("warn", this.context);
      console.warn(fmt + ` ${message}`, style1, style2, ...args);
    } else {
      console.warn(`[WARN]${this.context ? ` [${this.context}]` : ""} ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]) {
    if (!this.shouldLog()) return;
    if (isBrowser) {
      const { fmt, style1, style2 } = getStyledLabel("error", this.context);
      console.error(fmt + ` ${message}`, style1, style2, ...args);
    } else {
      console.error(`[ERROR]${this.context ? ` [${this.context}]` : ""} ${message}`, ...args);
    }
  }

  /**
   * Group related logs together.
   * @param label Group header
   * @param logs Callback to emit logs inside the group
   * @param collapsed Start collapsed (default true)
   * @param level Header style level (default 'info')
   */
  group(
    label: string,
    logs: () => void,
    collapsed: boolean = true,
    level: "debug" | "info" | "warn" | "error" = "info",
  ) {
    if (!this.shouldLog()) return;

    if (isBrowser) {
      const { fmt, style1, style2 } = getStyledLabel(level, this.context);
      const opener = collapsed ? console.groupCollapsed : console.group;
      opener.call(console, `${fmt} ${label}`, style1, style2);
      // Emit a header line inside the group for visibility
      switch (level) {
        case "debug":
          console.debug(`${fmt} ${label}`, style1, style2);
          break;
        case "warn":
          console.warn(`${fmt} ${label}`, style1, style2);
          break;
        case "error":
          console.error(`${fmt} ${label}`, style1, style2);
          break;
        default:
          console.info(`${fmt} ${label}`, style1, style2);
      }
      logs();
      console.groupEnd();
    } else {
      const header = `[${level.toUpperCase()}]${this.context ? ` [${this.context}]` : ""} ${label}`;
      (collapsed ? console.groupCollapsed : console.group).call(console, header);
      logs();
      console.groupEnd();
    }
  }
}

export default Logger;

