package com.dkowalczyk.scadasystem.controller;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "timestamp", Instant.now(),
                "service", "Energy Monitor Backend"
        );
    }
}