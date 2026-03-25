package com.timekeeper.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web layer configuration.
 *
 * Registers an explicit CharacterEncodingFilter that forces UTF-8 on every
 * HTTP request AND response, so the replacement character (U+FFFD) can never
 * appear due to a mismatched servlet encoding.
 *
 * Note: spring.servlet.encoding.* in application.properties also registers
 * this filter automatically, but declaring it explicitly here guarantees it
 * runs first in the filter chain and cannot be overridden by a container default.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public CharacterEncodingFilter characterEncodingFilter() {
        CharacterEncodingFilter filter = new CharacterEncodingFilter();
        filter.setEncoding("UTF-8");
        filter.setForceRequestEncoding(true);
        filter.setForceResponseEncoding(true);
        return filter;
    }
}
