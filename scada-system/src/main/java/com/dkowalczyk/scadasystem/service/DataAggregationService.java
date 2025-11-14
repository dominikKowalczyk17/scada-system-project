package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Service responsible for automated daily statistics aggregation.
 * Runs scheduled job at 00:05 every day to calculate previous day's statistics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DataAggregationService {
    private final StatsService statsService;

    @Getter
    private LocalDateTime lastRunTime;

    @Getter
    private LocalDate lastProcessedDate;

    @Getter
    private boolean lastRunSuccess = true;

    @Getter
    private String lastError;

    /**
     * Runs every day at 00:05 (5 minutes after midnight).
     * Aggregates yesterday's measurements into daily_stats table.
     *
     * Retry logic:
     * - If calculation fails, error is logged but application continues
     * - Next scheduled run will retry (won't re-calculate already successful days)
     * - Failed days can be manually recalculated by calling calculateStatsForDate()
     */
    @Scheduled(cron = "0 5 0 * * *")  // Sekundy Minuty Godziny Dzień Miesiąc Dzień_Tygodnia
    public void aggregateDailyStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        lastRunTime = LocalDateTime.now();
        lastProcessedDate = yesterday;

        try {
            log.info("🔄 Starting daily statistics aggregation for {}", yesterday);

            StatsDTO stats = statsService.calculateDailyStats(yesterday);

            lastRunSuccess = true;
            lastError = null;

            log.info("✅ Daily stats calculated successfully for {} - {} measurements processed, {:.1f}% data completeness",
                    yesterday,
                    stats.getMeasurementCount(),
                    stats.getDataCompleteness() * 100);

            // Log quality warnings if data completeness is low
            if (stats.getDataCompleteness() < 0.95) {
                log.warn("⚠️ Low data completeness for {}: {:.1f}% (expected ≥95%)",
                        yesterday, stats.getDataCompleteness() * 100);
            }

            // Log power quality events if any occurred
            if (stats.getVoltageSagCount() > 0 || stats.getVoltageSwellCount() > 0 ||
                stats.getThdViolationsCount() > 0) {
                log.info("📊 Power quality events on {}: {} sags, {} swells, {} THD violations",
                        yesterday,
                        stats.getVoltageSagCount(),
                        stats.getVoltageSwellCount(),
                        stats.getThdViolationsCount());
            }

        } catch (Exception e) {
            lastRunSuccess = false;
            lastError = e.getMessage();

            log.error("❌ Failed to calculate daily stats for {}: {}", yesterday, e.getMessage(), e);
            log.error("💡 Stats for {} can be recalculated by calling calculateStatsForDate({})",
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
        log.info("📅 Manual aggregation triggered for {}", date);
        return statsService.calculateDailyStats(date);
    }

    /**
     * Health check method to verify scheduled job status.
     *
     * @return true if last run was successful or no runs yet, false if last run failed
     */
    public boolean isHealthy() {
        return lastRunSuccess;
    }
}
