package com.timekeeper.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory login rate limiter.
 * Keyed on a composite "email:ip" string so that one user's failures cannot
 * block another user who shares the same NAT/VPN address.
 * Allows up to {@code MAX_ATTEMPTS} failed attempts within {@code WINDOW_MS}.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 60_000L; // 1 minute

    private record Bucket(int count, long windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Record a failed attempt for the given composite key.
     * Returns {@code true} if the key is now rate-limited (request should be rejected).
     */
    public boolean recordFailedAttempt(String key) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart() > WINDOW_MS) {
                return new Bucket(1, now);
            }
            return new Bucket(existing.count() + 1, existing.windowStart());
        });
        return bucket.count() > MAX_ATTEMPTS;
    }

    /** Check whether the key is currently rate-limited without recording a new attempt. */
    public boolean isRateLimited(String key) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.get(key);
        if (bucket == null) return false;
        if (now - bucket.windowStart() > WINDOW_MS) {
            buckets.remove(key);
            return false;
        }
        return bucket.count() >= MAX_ATTEMPTS;
    }

    /** Returns the number of seconds remaining in the current rate-limit window (0 if not limited). */
    public long getRetryAfterSeconds(String key) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.get(key);
        if (bucket == null) return 0;
        long elapsed = now - bucket.windowStart();
        if (elapsed >= WINDOW_MS) return 0;
        return (WINDOW_MS - elapsed + 999) / 1000; // ceiling in seconds
    }

    /** Clear the rate-limit record for a key (called on successful login). */
    public void clearAttempts(String key) {
        buckets.remove(key);
    }
}
