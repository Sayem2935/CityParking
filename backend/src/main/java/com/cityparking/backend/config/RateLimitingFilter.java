package com.cityparking.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Bucket4j.
 * Applies per-IP rate limits to sensitive endpoints:
 * - Login: 10 requests per minute
 * - Face verification: 20 requests per minute
 * - Plate verification: 30 requests per minute
 * - Access verification: 30 requests per minute
 * - Registration: 5 requests per minute
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    private final Map<String, Bucket> bucketCache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int LOGIN_LIMIT = 10;
    private static final int REGISTER_LIMIT = 5;
    private static final int FACE_VERIFY_LIMIT = 20;
    private static final int PLATE_VERIFY_LIMIT = 30;
    private static final int ACCESS_VERIFY_LIMIT = 30;
    private static final int DEFAULT_LIMIT = 60;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        int limit = resolveLimit(path, method);
        String clientIp = getClientIp(request);
        String cacheKey = clientIp + ":" + path + ":" + method;

        Bucket bucket = bucketCache.computeIfAbsent(cacheKey, k -> createBucket(limit));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        response.setHeader("X-Rate-Limit-Rate", String.valueOf(limit));
        response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
        } else {
            long waitTimeSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.setHeader("Retry-After", String.valueOf(waitTimeSeconds));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            Map<String, Object> body = Map.of(
                    "success", false,
                    "message", "Rate limit exceeded. Please try again later.",
                    "retryAfterSeconds", waitTimeSeconds
            );
            response.getWriter().write(objectMapper.writeValueAsString(body));
            log.warn("Rate limit exceeded for IP {} on {} {}", clientIp, method, path);
        }
    }

    private int resolveLimit(String path, String method) {
        if (path.equals("/api/auth/login") && "POST".equals(method)) {
            return LOGIN_LIMIT;
        }
        if (path.equals("/api/auth/register") && "POST".equals(method)) {
            return REGISTER_LIMIT;
        }
        if (path.startsWith("/api/face-verification/") && "POST".equals(method)) {
            return FACE_VERIFY_LIMIT;
        }
        if (path.startsWith("/api/plate-verification/") && "POST".equals(method)) {
            return PLATE_VERIFY_LIMIT;
        }
        if (path.startsWith("/api/access-verification/") && "POST".equals(method)) {
            return ACCESS_VERIFY_LIMIT;
        }
        return DEFAULT_LIMIT;
    }

    private Bucket createBucket(int limit) {
        Bandwidth bandwidth = Bandwidth.classic(limit, Refill.greedy(limit, WINDOW));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }
}