import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, it } from "vitest";

it("boots cached navigation and initial JS/CSS without network after worker installation", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cachesByName = new Map<string, Map<string, Response>>();
  let online = true;
  const key = (request: string | { url: string }) => typeof request === "string" ? request : new URL(request.url).pathname;
  const network = async (request: string | { url: string }) => {
    if (!online) throw new Error("offline");
    const url = key(request);
    return new Response(url === "/" ? '<html><script src="/_next/static/chunks/app-123.js"></script><link href="/_next/static/css/app-456.css"></html>' : `asset:${url}`);
  };
  const caches = {
    async open(name: string) {
      if (!cachesByName.has(name)) cachesByName.set(name, new Map());
      const cache = cachesByName.get(name)!;
      return {
        async addAll(urls: string[]) { for (const url of urls) cache.set(url, await network(url)); },
        async match(request: string | { url: string }) { return cache.get(key(request))?.clone(); },
        async put(request: string | { url: string }, response: Response) { cache.set(key(request), response); },
      };
    },
    async match(request: string | { url: string }) { for (const cache of cachesByName.values()) if (cache.has(key(request))) return cache.get(key(request))!.clone(); },
    async keys() { return [...cachesByName.keys()]; },
    async delete(name: string) { return cachesByName.delete(name); },
  };
  vm.runInNewContext(readFileSync("public/sw-v2.js", "utf8"), { self: { location: { origin: "https://field.test" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {} } }, caches, fetch: network, URL, Response });
  let pending: Promise<unknown> | undefined;
  handlers.install({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } }); await pending;
  online = false;
  for (const [path, destination, mode] of [["/", "document", "navigate"], ["/_next/static/chunks/app-123.js", "script", "cors"], ["/_next/static/css/app-456.css", "style", "cors"]]) {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url: `https://field.test${path}`, method: "GET", destination, mode }, respondWith: (result: Promise<Response>) => { response = result; }, waitUntil: () => {} });
    expect((await response)?.ok).toBe(true); expect(await (await response)?.text()).toContain(path === "/" ? "<html>" : `asset:${path}`);
  }
  let intercepted = false;
  handlers.fetch({ request: { url: "https://tile.openstreetmap.org/1/1/1.png", method: "GET" }, respondWith: () => { intercepted = true; } });
  expect(intercepted).toBe(false);
});
