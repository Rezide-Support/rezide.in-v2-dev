import axios, { type AxiosAdapter, type AxiosInstance } from "axios";
import MockAdapter from "axios-mock-adapter";
import { API_DOMAINS, domainOf } from "@/lib/api/mocking";
import { registerHandlers } from "./handlers";

/**
 * Installs the mock API on an Axios instance. Requests never leave the
 * process; responses come from fixed fixtures plus an in-memory store that
 * resets on reload. Remove by setting NEXT_PUBLIC_API_MOCKING=off.
 *
 * With `domains`, only requests whose first path segment is listed are mocked;
 * the rest go to the real API through the instance's original adapter.
 */
export function installMockApi(
  instance: AxiosInstance,
  options: { delayMs?: number; domains?: readonly string[] } = {},
) {
  const delay =
    options.delayMs ?? Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? (process.env.NODE_ENV === "test" ? 0 : 250));
  const original = instance.defaults.adapter;
  const mock = new MockAdapter(instance, { delayResponse: delay, onNoMatch: "throwException" });
  registerHandlers(mock);
  if (options.domains) {
    const mocked = new Set(options.domains.filter(domain => (API_DOMAINS as readonly string[]).includes(domain)));
    const mockAdapter = instance.defaults.adapter as AxiosAdapter;
    const realAdapter = axios.getAdapter(original);
    instance.defaults.adapter = (config) => (mocked.has(domainOf(config.url)) ? mockAdapter : realAdapter)(config);
  }
  return mock;
}
