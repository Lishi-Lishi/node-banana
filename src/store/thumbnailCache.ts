/**
 * Simple in-memory cache for image thumbnails.
 * Keys are derived from the first portion of the base64 source to avoid
 * hashing multi-MB strings. Not persisted — thumbnails regenerate cheaply.
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function cacheKey(src: string): string {
  // Sample from multiple positions + length to create a collision-resistant key
  // without hashing the entire multi-MB string.
  const len = src.length;
  const mid = len >>> 1;
  return `${len}:${src.slice(30, 90)}:${src.slice(mid, mid + 60)}:${src.slice(-60)}`;
}

export function getThumbnail(src: string): string | undefined {
  return cache.get(cacheKey(src));
}

export function setThumbnail(src: string, thumbnail: string): void {
  cache.set(cacheKey(src), thumbnail);
}

export function getPending(src: string): Promise<string> | undefined {
  return pending.get(cacheKey(src));
}

export function setPending(src: string, promise: Promise<string>): void {
  pending.set(cacheKey(src), promise);
}

export function removePending(src: string): void {
  pending.delete(cacheKey(src));
}
