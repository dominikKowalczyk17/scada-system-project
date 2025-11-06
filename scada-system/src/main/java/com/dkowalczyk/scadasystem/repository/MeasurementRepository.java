package com.dkowalczyk.scadasystem.repository;

import com.dkowalczyk.scadasystem.model.entity.Measurement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeasurementRepository extends JpaRepository<Measurement, Long> {

    /**
     * Znajdź ostatni pomiar
     */
    Optional<Measurement> findTopByOrderByTimeDesc();

    /**
     * Historia pomiarów w zakresie czasowym
     */
    List<Measurement> findByTimeBetweenOrderByTimeDesc(
            Instant from,
            Instant to
    );

    /**
     * Statystyki dzienne (agregacje)
     */
    @Query("""
        SELECT
            MIN(m.voltageRms) as minVoltage,
            MAX(m.voltageRms) as maxVoltage,
            AVG(m.voltageRms) as avgVoltage,
            AVG(m.powerActive) as avgPower
        FROM Measurement m
        WHERE m.time > :since
    """)
    Object getDailyStats(Instant since);
}