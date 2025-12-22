package com.dkowalczyk.scadasystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dkowalczyk.scadasystem.model.entity.DailyStats;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for querying daily aggregated statistics.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
public interface DailyStatsRepository extends JpaRepository<DailyStats, Long> {

    /** Finds statistics for specific date. */
    Optional<DailyStats> findByDate(LocalDate date);

    /** Finds statistics for date range (inclusive), ordered by date ascending. */
    List<DailyStats> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);
}
