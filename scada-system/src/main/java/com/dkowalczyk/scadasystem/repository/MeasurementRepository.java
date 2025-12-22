package com.dkowalczyk.scadasystem.repository;

import com.dkowalczyk.scadasystem.model.entity.Measurement;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository for querying electrical measurement data.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Repository
public interface MeasurementRepository extends JpaRepository<Measurement, Long> {

    /** Finds the most recent valid measurement. */
    Optional<Measurement> findTopByIsValidTrueOrderByTimeDesc();

    /** Finds last 100 valid measurements for dashboard recent history. */
    List<Measurement> findTop100ByIsValidTrueOrderByTimeDesc();

    /** Finds valid measurements within time range with pagination. */
    List<Measurement> findByIsValidTrueAndTimeBetween(Instant from, Instant to, Pageable pageable);

    /** Calculates daily aggregated statistics (min/max/avg voltage and power) since given time. */
    @Query("""
        SELECT
            MIN(m.voltageRms) as minVoltage,
            MAX(m.voltageRms) as maxVoltage,
            AVG(m.voltageRms) as avgVoltage,
            AVG(m.powerActive) as avgPower
        FROM Measurement m
        WHERE m.time > :since
        AND m.isValid = true
    """)
    Object getDailyStats(Instant since);
}