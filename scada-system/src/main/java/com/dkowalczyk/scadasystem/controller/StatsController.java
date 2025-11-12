package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    /**
     * Statystyki dzienne
     * GET /api/stats/daily
     */
    @GetMapping("/daily")
    public ResponseEntity<StatsDTO> getDailyStats() {
        return ResponseEntity.of(statsService.getStatsForDate(LocalDate.now()));
    }
}