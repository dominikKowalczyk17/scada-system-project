package com.dkowalczyk.scadasystem.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.repository.DailyStatsRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service for querying daily power quality statistics.
 * Simplified for domestic use - focuses on common homeowner queries.
 */
@Service
@RequiredArgsConstructor
public class StatsService {

    private final DailyStatsRepository repository;

    /**
     * Get today's statistics.
     * Most common query for homeowner dashboard.
     */
    public Optional<StatsDTO> getTodayStats() {
        LocalDate today = LocalDate.now();
        return getStatsForDate(today);
    }

    /**
     * Get last N days of statistics.
     * For trend graphs (last 7 days, last 30 days).
     */
    public List<StatsDTO> getLastDaysStats(int days) {
        LocalDate from = LocalDate.now().minusDays(days - 1);
        LocalDate to = LocalDate.now();

        return repository.findByDateBetweenOrderByDateAsc(from, to)
                .stream()
                .map(StatsDTO::new)
                .toList();
    }

    /**
     * Get stats for specific date.
     * For historical lookup.
     */
    public Optional<StatsDTO> getStatsForDate(LocalDate date) {
        return repository.findByDate(date)
                .map(StatsDTO::new);
    }

    public StatsDTO calculateDailyStats() {
        // This method would calculate stats from measurements
        // For now, return empty stats - to be implemented later
        return StatsDTO.builder()
                .date(LocalDate.now())
                .build();
    }
}
