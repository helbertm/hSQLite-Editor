export const runtimeTestOverrides = new Map();

export function assertTestRuntime() {
  if (globalThis.__HSQLITE_TEST__ !== true) {
    throw new Error("Runtime test hooks are unavailable outside the test harness.");
  }
}

export function setRuntimeTestOverride(name, override) {
  assertTestRuntime();
  const key = String(name || "");
  if (!key) throw new TypeError("Runtime test override requires a name.");
  if (override === null) {
    runtimeTestOverrides.delete(key);
    return;
  }
  if (typeof override !== "function") throw new TypeError("Runtime test override must be a function or null.");
  runtimeTestOverrides.set(key, override);
}

export function invokeRuntimeTestOverride(name, args, fallback) {
  const override = globalThis.__HSQLITE_TEST__ === true ? runtimeTestOverrides.get(name) : null;
  return override ? override(...args, fallback) : fallback(...args);
}
