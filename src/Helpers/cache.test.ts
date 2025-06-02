import { describe, expect, setSystemTime, test } from "bun:test";
import { addSeconds } from "date-fns";
import { Cache, invalidateCache, withCache } from "./cache";

describe("Cache", () => {
  test("get", () => {
    const cache = new Cache(0);
    cache.set("foo", "bar", 100);

    expect(cache.get<string>("foo")).toBe("bar");
  });

  test("del", () => {
    const cache = new Cache(0);
    cache.set("foo", "bar", 100);

    expect(cache.get<string>("foo")).toBe("bar");

    cache.del("foo");

    expect(cache.get("foo")).toBe(undefined);
  });

  test("garbageCollect", () => {
    const cache = new Cache(0);
    cache.set("foo", "bar", 30);

    expect(cache.get<string>("foo")).toBe("bar");

    setSystemTime(addSeconds(new Date(), 60));

    cache.garbageCollect(true);

    expect(cache.get("foo")).toBe(undefined);
  });

  test("separate caches", () => {
    const cache1 = new Cache(0);
    const cache2 = new Cache(0);

    cache1.set("foo", "bar", 100);

    expect(cache1.get<string>("foo")).toBe("bar");
    expect(cache2.get("foo")).toBe(undefined);
  });
});

describe("withCache", () => {
  test("get", async () => {
    const now = new Date();
    setSystemTime(now);

    const result = await withCache("foo:withcache", async () => now, 100);
    expect(result).toBe(now);

    const now2 = addSeconds(now, 60);
    setSystemTime(now2);

    const result2 = await withCache("foo:withcache", async () => now2, 100);
    expect(result2).toBe(now);
  });

  test("invalidate", async () => {
    const now = new Date();
    setSystemTime(now);

    const result = await withCache("foo:invalidate", async () => now, 100);
    expect(result).toBe(now);

    const now2 = addSeconds(now, 60);
    setSystemTime(now2);

    invalidateCache("foo:invalidate");

    const result2 = await withCache("foo:invalidate", async () => now2, 100);
    expect(result2).toBe(now2);
  });
});
