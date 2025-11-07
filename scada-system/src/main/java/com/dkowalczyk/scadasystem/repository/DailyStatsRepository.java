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

    // TODO(): Add method to find statistics for a specific date
    // Method name pattern: findByDate
    // Parameter: LocalDate date
    // Return type: Optional<DailyStats> (Optional because date might not exist)

    // TODO(): Add method to find statistics between two dates
    // Method name pattern: findByDateBetween
    // Parameters: LocalDate from, LocalDate to
    // Return type: List<DailyStats> (List because multiple dates)
}
