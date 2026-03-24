package com.timekeeper.security;

import com.timekeeper.repository.EmployeeRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;

    /**
     * Skip this filter for public auth endpoints and Swagger UI — they don't need JWT processing.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Only skip JWT processing for truly public endpoints.
        // /change-password and any future authenticated auth routes must NOT be skipped.
        return path.equals("/api/v1/auth/login")
                || path.equals("/api/v1/auth/logout")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // No Bearer token present — pass through; Spring Security will return 401 if the
        // endpoint requires authentication.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            String userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = employeeRepository.findByEmail(userEmail).orElse(null);
                if (userDetails == null) {
                    log.warn("JWT references unknown user '{}' for {}", userEmail, request.getRequestURI());
                    sendUnauthorized(response, "Authentication required");
                    return;
                }

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    // Token signature is valid but it has been revoked (blacklisted)
                    log.debug("Revoked token used by '{}' for {}", userEmail, request.getRequestURI());
                    sendUnauthorized(response, "Token has been revoked. Please log in again.");
                    return;
                }
            }
        } catch (ExpiredJwtException e) {
            log.debug("Expired JWT for {}: {}", request.getRequestURI(), e.getMessage());
            sendUnauthorized(response, "Session expired. Please log in again.");
            return;
        } catch (MalformedJwtException | UnsupportedJwtException | SignatureException e) {
            log.warn("Invalid JWT for {}: {}", request.getRequestURI(), e.getMessage());
            sendUnauthorized(response, "Invalid token.");
            return;
        } catch (Exception e) {
            log.error("Unexpected error processing JWT for {}", request.getRequestURI(), e);
            sendUnauthorized(response, "Authentication error.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
    }
}
