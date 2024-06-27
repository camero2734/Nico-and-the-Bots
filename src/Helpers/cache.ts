import NodeCache from 'node-cache';
import { DeepReadonly } from '../Structures/SlashCommandOptions';

const cache = new NodeCache({ useClones: false, checkperiod: 1 });

export const withCache = async <T>(key: string, fn: () => Promise<T>, ttlSeconds = 60): Promise<DeepReadonly<T>> => {
    const cached = cache.get<T>(key);
    if (cached) return cached;

    const result = await fn();
    cache.set(key, result, ttlSeconds);
    return result;
}

export const invalidateCache = (key: string) => {
    cache.del(key);
}
