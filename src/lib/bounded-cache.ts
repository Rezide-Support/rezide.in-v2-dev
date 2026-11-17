/** TTL cleanup and insertion-order eviction for process-local caches. */
export function setBounded<K, V extends { at: number }>(map: Map<K, V>, key: K, value: V, max: number, ttl: number, now = Date.now()) {
  for (const [entryKey, entry] of map) if (now - entry.at >= ttl) map.delete(entryKey);
  map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
  }
}
