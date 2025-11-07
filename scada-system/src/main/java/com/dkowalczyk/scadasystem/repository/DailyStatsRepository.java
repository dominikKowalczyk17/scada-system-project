package com.dkowalczyk.scadasystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dkowalczyk.scadasystem.model.entity.DailyStats;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for querying DailyStats entities.
 * Spring Data JPA automatically generates implementation based on method names.
 */
public interface DailyStatsRepository extends JpaRepository<DailyStats, Long> {

    /**
     * Find statistics for specific date.
     * @param date the date to query
     * @return Optional containing DailyStats if found, empty otherwise
     */
    Optional<DailyStats> findByDate(LocalDate date);

    /**
     * Find statistics for a date range (inlcusive).
     * @param from start date (inclusive)
     * @param to end date (inclusive)
     * @return List of DailyStats ordered by date
     */
    List<DailyStats> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);
}
