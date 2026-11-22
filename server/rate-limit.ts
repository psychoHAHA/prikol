export function createRateLimiter({
  limit = 120,
  windowMs = 60000,
  now = Date.now,
} = {}) {
  const clients = new Map()
  return (address: string) => {
    const time = now()
    for (const [key, value] of clients)
      if (value.reset <= time) clients.delete(key)
    let entry = clients.get(address)
    if (!entry) {
      entry = { count: 0, reset: time + windowMs }
      clients.set(address, entry)
    }
    entry.count++
    return {
      allowed: entry.count <= limit,
      retryAfter: Math.max(1, Math.ceil((entry.reset - time) / 1000)),
    }
  }
}
