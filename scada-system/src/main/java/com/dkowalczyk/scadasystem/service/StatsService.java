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
        // TODO(): Implement this method
        // Hints:
        // 1. Get today's date with LocalDate.now()
        // 2. Call getStatsForDate(date)
        throw new UnsupportedOperationException("TODO: Implement getTodayStats");
    }

    /**
     * Get last N days of statistics.
     * For trend graphs (last 7 days, last 30 days).
     */
    public List<StatsDTO> getLastDaysStats(int days) {
        // TODO(): Implement this method
        // Hints:
        // 1. Calculate 'from' date: LocalDate.now().minusDays(days - 1)
        // 2. Calculate 'to' date: LocalDate.now()
        // 3. Query repository.findByDateBetween(from, to)
        // 4. Convert each entity to DTO using: new StatsDTO(entity)
        // 5. Use Java streams: .stream().map(StatsDTO::new).toList()
        throw new UnsupportedOperationException("TODO: Implement getLastDaysStats");
    }

    /**
     * Get stats for specific date.
     * For historical lookup.
     */
    public Optional<StatsDTO> getStatsForDate(LocalDate date) {
        // TODO(): Implement this method
        // Hints:
        // 1. Query repository.findByDate(date)
        // 2. Use Optional.map() to convert entity to DTO
        // 3. Example: repository.findByDate(date).map(StatsDTO::new)
        throw new UnsupportedOperationException("TODO: Implement getStatsForDate");
    }
}
