import { secondsToMilliseconds } from "date-fns";
import type { DeepReadonly } from "../Structures/SlashCommandOptions";

export class Cache {
  private cache: Map<string, { data: unknown; expires: number }>;

  constructor(private gcSeconds = 60) {
    this.cache = new Map();
    if (gcSeconds !== 0) this.garbageCollect();
  }

  get<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    if (cached.expires < Date.now()) {
      this.del(key);
      return undefined;
    }
    return cached.data as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number) {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + secondsToMilliseconds(ttlSeconds),
    });
  }

  del(key: string) {
    this.cache.delete(key);
  }

  garbageCollect(once = false) {
    for (const [key, value] of this.cache) {
      if (value.expires < Date.now()) {
        this.del(key);
      }
    }
    if (once) return;

    setTimeout(() => this.garbageCollect(), secondsToMilliseconds(this.gcSeconds));
  }
}

const cache = new Cache();

export const withCache = async <T>(key: string, fn: () => Promise<T>, ttlSeconds = 60): Promise<DeepReadonly<T>> => {
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const result = await fn();
  cache.set(key, result, ttlSeconds);
  return result;
};

export const invalidateCache = (key: string) => {
  cache.del(key);
};
