package com.timekeeper.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures Swagger / OpenAPI 3.
 *
 * UI available at: http://localhost:8080/swagger-ui/index.html
 * Raw spec at:     http://localhost:8080/v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("TimeKeeper API")
                        .version("v1")
                        .description("Time-tracking SaaS backend APIs. " +
                                "Authenticate via POST /api/v1/auth/login, " +
                                "then click 'Authorize' and enter: Bearer <token>")
                        .contact(new Contact().name("TimeKeeper Dev Team")))
                // Apply Bearer auth globally so every endpoint has the lock icon
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste your JWT token (without 'Bearer ' prefix)")));
    }
}
