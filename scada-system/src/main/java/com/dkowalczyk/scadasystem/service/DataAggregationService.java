package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Service responsible for automated daily statistics aggregation.
 * Runs scheduled job at 00:05 every day to calculate previous day's statistics.
 * <p>
 * Thread-safe implementation using ReadWriteLock for concurrent access to status fields.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DataAggregationService {
    private final StatsService statsService;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    private volatile LocalDateTime lastRunTime;
    private volatile LocalDate lastProcessedDate;
    private volatile boolean lastRunSuccess = true;
    private volatile String lastError;

    /**
     * Runs every day at 00:05 (5 minutes after midnight).
     * Aggregates yesterday's measurements into daily_stats table.
     * <p>
     * Retry logic:
     * - If calculation fails, error is logged but application continues
     * - Next scheduled run will retry (won't re-calculate already successful days)
     * - Failed days can be manually recalculated by calling calculateStatsForDate()
     */
    @Scheduled(cron = "0 5 0 * * *")  // Sekundy Minuty Godziny Dzień Miesiąc Dzień_Tygodnia
    public void aggregateDailyStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);

        lock.writeLock().lock();
        try {
            lastRunTime = LocalDateTime.now();
            lastProcessedDate = yesterday;
        } finally {
            lock.writeLock().unlock();
        }

        try {
            log.info("🔄 Starting daily statistics aggregation for {}", yesterday);

            StatsDTO stats = statsService.calculateDailyStats(yesterday);

            lock.writeLock().lock();
            try {
                lastRunSuccess = true;
                lastError = null;
            } finally {
                lock.writeLock().unlock();
            }

            Integer rawMeasurementCount = stats.getMeasurementCount();
            Double rawDataCompleteness = stats.getDataCompleteness();
            int measurementCount = rawMeasurementCount != null ? rawMeasurementCount : 0;
            double dataCompleteness = rawDataCompleteness != null ? rawDataCompleteness : 0;

            log.info("Daily stats calculated successfully for {} - {} measurements processed, {:.1f}% data completeness",
                    yesterday,
                    measurementCount,
                    dataCompleteness * 100);

            // Log quality warnings if data completeness is low
            if (dataCompleteness < 0.95) {
                log.warn("Low data completeness for {}: {:.1f}% (expected ≥95%)",
                        yesterday, dataCompleteness * 100);
            }

            // Log power quality events if any occurred
            if (stats.getVoltageSagCount() > 0 || stats.getVoltageSwellCount() > 0 ||
                    stats.getThdViolationsCount() > 0) {
                log.info("Power quality events on {}: {} sags, {} swells, {} THD violations",
                        yesterday,
                        stats.getVoltageSagCount(),
                        stats.getVoltageSwellCount(),
                        stats.getThdViolationsCount());
            }

        } catch (Exception e) {
            lock.writeLock().lock();
            try {
                lastRunSuccess = false;
                lastError = e.getMessage();
            } finally {
                lock.writeLock().unlock();
            }

            log.error("Failed to calculate daily stats for {}: {}", yesterday, e.getMessage(), e);
            log.error("Stats for {} can be recalculated by calling calculateStatsForDate({})",
                    yesterday, yesterday);
        }
    }

    /**
     * Manually trigger statistics calculation for a specific date.
     * Useful for:
     * - Recalculating failed aggregations
     * - Backfilling historical data
     * - Testing purposes
     *
     * @param date the date to calculate statistics for
     * @return calculated statistics
     */
    public StatsDTO calculateStatsForDate(LocalDate date) {
        log.info("Manual aggregation triggered for {}", date);
        return statsService.calculateDailyStats(date);
    }

    /**
     * Health check method to verify scheduled job status.
     *
     * @return true if last run was successful or no runs yet, false if last run failed
     */
    public boolean isHealthy() {
        lock.readLock().lock();
        try {
            return lastRunSuccess;
        } finally {
            lock.readLock().unlock();
        }
    }

    /**
     * Thread-safe getter for last run time.
     *
     * @return timestamp of last scheduled run
     */
    public LocalDateTime getLastRunTime() {
        lock.readLock().lock();
        try {
            return lastRunTime;
        } finally {
            lock.readLock().unlock();
        }
    }

    /**
     * Thread-safe getter for last processed date.
     *
     * @return date of last processed statistics
     */
    public LocalDate getLastProcessedDate() {
        lock.readLock().lock();
        try {
            return lastProcessedDate;
        } finally {
            lock.readLock().unlock();
        }
    }

    /**
     * Thread-safe getter for last run success status.
     *
     * @return true if last run succeeded, false otherwise
     */
    public boolean isLastRunSuccess() {
        lock.readLock().lock();
        try {
            return lastRunSuccess;
        } finally {
            lock.readLock().unlock();
        }
    }

    /**
     * Thread-safe getter for last error message.
     *
     * @return error message from last failed run, or null if no error
     */
    public String getLastError() {
        lock.readLock().lock();
        try {
            return lastError;
        } finally {
            lock.readLock().unlock();
        }
    }
}
