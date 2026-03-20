package com.timekeeper.security;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * In-memory JWT blacklist.
 * <p>
 * Stores revoked tokens until their natural expiry.  A background thread
 * sweeps expired entries every 10 minutes so memory stays bounded.
 * This is intentionally simple — suitable for a single-node personal project.
 * For multi-node deployments replace with a shared store (Redis, DB).
 */
@Component
public class TokenBlacklist {

    // value: expiry epoch-millis stored alongside the token so sweeper can remove them
    private final ConcurrentHashMap<String, Long> blacklistedTokens = new ConcurrentHashMap<>();

    private final ScheduledExecutorService sweeper =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "jwt-blacklist-sweeper");
                t.setDaemon(true);
                return t;
            });

    public TokenBlacklist() {
        // Remove expired entries every 10 minutes
        sweeper.scheduleAtFixedRate(this::removeExpired, 10, 10, TimeUnit.MINUTES);
    }

    /** Add a token to the blacklist until its expiry timestamp. */
    public void blacklist(String token, long expiryEpochMillis) {
        blacklistedTokens.put(token, expiryEpochMillis);
    }

    /** Returns true if the token has been revoked. */
    public boolean isBlacklisted(String token) {
        return blacklistedTokens.containsKey(token);
    }

    private void removeExpired() {
        long now = System.currentTimeMillis();
        blacklistedTokens.entrySet().removeIf(e -> e.getValue() <= now);
    }
}
