import * as testApi from "./test-api.mjs";
import "./ui/05-localization-refresh.js";
import "./ui/80-bindings.js";

if (globalThis.__HSQLITE_TEST__ === true) {
  globalThis.__HSQLITE_TEST_API__ = testApi;
}
