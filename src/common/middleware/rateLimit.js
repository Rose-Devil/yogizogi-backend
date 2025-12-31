const buckets = new Map();

function nowMs() {
  return Date.now();
}

function cleanupOld({ maxAgeMs }) {
  const cutoff = nowMs() - maxAgeMs;
  for (const [key, value] of buckets.entries()) {
    if (value.lastSeenAt < cutoff) buckets.delete(key);
  }
}

/**
 * Very small in-memory rate limiter (per-process).
 * Production: swap to Redis (shared) + WAF rules.
 */
function rateLimit({
  keyPrefix,
  windowMs,
  max,
  getKey,
  message = "Too many requests",
  statusCode = 429,
}) {
  if (!keyPrefix) throw new Error("rateLimit: keyPrefix required");
  if (!windowMs || windowMs <= 0) throw new Error("rateLimit: windowMs must be > 0");
  if (!max || max <= 0) throw new Error("rateLimit: max must be > 0");

  const maxAgeMs = Math.max(windowMs * 10, 60_000);

  return (req, res, next) => {
    cleanupOld({ maxAgeMs });

    const key = `${keyPrefix}:${getKey ? getKey(req) : req.ip}`;
    const current = buckets.get(key);
    const ts = nowMs();

    if (!current || ts - current.windowStartAt >= windowMs) {
      buckets.set(key, { windowStartAt: ts, count: 1, lastSeenAt: ts });
      return next();
    }

    current.lastSeenAt = ts;
    current.count += 1;

    if (current.count > max) {
      const retryAfterSec = Math.ceil((current.windowStartAt + windowMs - ts) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
      return res.status(statusCode).json({ success: false, message });
    }

    return next();
  };
}

module.exports = { rateLimit };

