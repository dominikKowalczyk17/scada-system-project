package com.dkowalczyk.scadasystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@Slf4j
@RequiredArgsConstructor
public class DataAggregationService {
    private final StatsService statsService;

    /**
     * Runs every day at 00:05 (5 minutes after midnight)
     * Aggregates yesterday's measurements into daily_stats table
     */
    @Scheduled(cron = "0 5 0 * * *")  // Sekundy Minuty Godziny Dzień Miesiąc Dzień_Tygodnia
    public void aggregateDailyStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        statsService.calculateDailyStats(yesterday);
        log.info("Daily stats calculated for yesterday {}", yesterday);
    }
}
