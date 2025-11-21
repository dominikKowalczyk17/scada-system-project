package com.dkowalczyk.scadasystem.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");

        // Allow CORS for WebSocket endpoint (SockJS handshake needs CORS)
        registry.addMapping("/ws/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}