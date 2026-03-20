package com.timekeeper.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory per-IP login rate limiter.
 * Allows up to {@code MAX_ATTEMPTS} failed attempts within {@code WINDOW_MS}.
 * Uses a leaky-bucket approach: when the window expires, the counter resets.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 60_000L; // 1 minute

    private record Bucket(int count, long windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Record a failed attempt for the given IP.
     * Returns {@code true} if the IP is now rate-limited (should be rejected).
     */
    public boolean recordFailedAttempt(String ip) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.compute(ip, (k, existing) -> {
            if (existing == null || now - existing.windowStart() > WINDOW_MS) {
                return new Bucket(1, now);
            }
            return new Bucket(existing.count() + 1, existing.windowStart());
        });
        return bucket.count() > MAX_ATTEMPTS;
    }

    /** Check if the IP is currently rate-limited without recording a new attempt. */
    public boolean isRateLimited(String ip) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.get(ip);
        if (bucket == null) return false;
        if (now - bucket.windowStart() > WINDOW_MS) {
            buckets.remove(ip);
            return false;
        }
        return bucket.count() >= MAX_ATTEMPTS;
    }

    /** Clear the rate-limit record for an IP (called on successful login). */
    public void clearAttempts(String ip) {
        buckets.remove(ip);
    }
}
