package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.model.entity.DailyStats;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.DailyStatsRepository;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for StatsService using Mockito.
 *
 * Tests focus on business logic with mocked repositories.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StatsService Unit Tests")
class StatsServiceTest {

    @Mock
    private DailyStatsRepository dailyStatsRepository;

    @Mock
    private MeasurementRepository measurementRepository;

    @InjectMocks
    private StatsService statsService;

    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        testDate = LocalDate.of(2025, 1, 15);
    }

    // ========================================
    // getTodayStats() Tests
    // ========================================

    @Test
    @DisplayName("getTodayStats() should return today's statistics when available")
    void getTodayStats_shouldReturnTodayStats_whenAvailable() {
        // Given: Mock repository returns stats for today
        LocalDate today = LocalDate.now();
        DailyStats mockStats = createMockDailyStats(today);
        when(dailyStatsRepository.findByDate(today)).thenReturn(Optional.of(mockStats));

        // When: Get today's stats
        Optional<StatsDTO> result = statsService.getTodayStats();

        // Then: Should return DTO with today's data
        assertThat(result).isPresent();
        assertThat(result.get().getDate()).isEqualTo(today);
        assertThat(result.get().getAvgVoltage()).isEqualTo(230.0);
        verify(dailyStatsRepository).findByDate(today);
    }

    @Test
    @DisplayName("getTodayStats() should return empty Optional when no data available")
    void getTodayStats_shouldReturnEmpty_whenNoDataAvailable() {
        // Given: Repository returns empty
        LocalDate today = LocalDate.now();
        when(dailyStatsRepository.findByDate(today)).thenReturn(Optional.empty());

        // When: Get today's stats
        Optional<StatsDTO> result = statsService.getTodayStats();

        // Then: Should return empty Optional
        assertThat(result).isEmpty();
        verify(dailyStatsRepository).findByDate(today);
    }

    // ========================================
    // getLastDaysStats() Tests
    // ========================================

    @Test
    @DisplayName("getLastDaysStats() should return statistics for last N days")
    void getLastDaysStats_shouldReturnStats_forLastNDays() {
        // Given: Mock repository returns stats for 3 days
        LocalDate from = LocalDate.now().minusDays(2);
        LocalDate to = LocalDate.now();
        List<DailyStats> mockStats = List.of(
                createMockDailyStats(from),
                createMockDailyStats(from.plusDays(1)),
                createMockDailyStats(to)
        );
        when(dailyStatsRepository.findByDateBetweenOrderByDateAsc(from, to))
                .thenReturn(mockStats);

        // When: Get last 3 days stats
        List<StatsDTO> result = statsService.getLastDaysStats(3);

        // Then: Should return 3 DTOs
        assertThat(result).hasSize(3);
        assertThat(result.get(0).getDate()).isEqualTo(from);
        assertThat(result.get(2).getDate()).isEqualTo(to);
        verify(dailyStatsRepository).findByDateBetweenOrderByDateAsc(from, to);
    }

    @Test
    @DisplayName("getLastDaysStats() should throw exception when days < 1")
    void getLastDaysStats_shouldThrowException_whenDaysLessThanOne() {
        // When & Then: Should throw IllegalArgumentException
        assertThatThrownBy(() -> statsService.getLastDaysStats(0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("days parameter must be at least 1");

        assertThatThrownBy(() -> statsService.getLastDaysStats(-5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("days parameter must be at least 1");

        // Verify no repository calls were made
        verifyNoInteractions(dailyStatsRepository);
    }

    @Test
    @DisplayName("getLastDaysStats() should return empty list when no data available")
    void getLastDaysStats_shouldReturnEmptyList_whenNoDataAvailable() {
        // Given: Repository returns empty list
        LocalDate from = LocalDate.now().minusDays(6);
        LocalDate to = LocalDate.now();
        when(dailyStatsRepository.findByDateBetweenOrderByDateAsc(from, to))
                .thenReturn(Collections.emptyList());

        // When: Get last 7 days stats
        List<StatsDTO> result = statsService.getLastDaysStats(7);

        // Then: Should return empty list
        assertThat(result).isEmpty();
        verify(dailyStatsRepository).findByDateBetweenOrderByDateAsc(from, to);
    }

    // ========================================
    // getStatsForDate() Tests
    // ========================================

    @Test
    @DisplayName("getStatsForDate() should return stats for specific date")
    void getStatsForDate_shouldReturnStats_forSpecificDate() {
        // Given: Mock repository returns stats for specific date
        DailyStats mockStats = createMockDailyStats(testDate);
        when(dailyStatsRepository.findByDate(testDate)).thenReturn(Optional.of(mockStats));

        // When: Get stats for specific date
        Optional<StatsDTO> result = statsService.getStatsForDate(testDate);

        // Then: Should return DTO for that date
        assertThat(result).isPresent();
        assertThat(result.get().getDate()).isEqualTo(testDate);
        verify(dailyStatsRepository).findByDate(testDate);
    }

    @Test
    @DisplayName("getStatsForDate() should return empty Optional when date not found")
    void getStatsForDate_shouldReturnEmpty_whenDateNotFound() {
        // Given: Repository returns empty
        when(dailyStatsRepository.findByDate(testDate)).thenReturn(Optional.empty());

        // When: Get stats for specific date
        Optional<StatsDTO> result = statsService.getStatsForDate(testDate);

        // Then: Should return empty Optional
        assertThat(result).isEmpty();
        verify(dailyStatsRepository).findByDate(testDate);
    }

    // ========================================
    // calculateDailyStats() Tests - Edge Cases
    // ========================================

    @Test
    @DisplayName("calculateDailyStats() should return empty DTO when no measurements available")
    void calculateDailyStats_shouldReturnEmptyDTO_whenNoMeasurements() {
        // Given: No measurements for the date
        Instant startOfDay = testDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = testDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        when(measurementRepository.findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay))
                .thenReturn(Collections.emptyList());

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should return DTO with only date set
        assertThat(result).isNotNull();
        assertThat(result.getDate()).isEqualTo(testDate);
        assertThat(result.getAvgVoltage()).isZero();
        assertThat(result.getMeasurementCount()).isZero();

        // Verify no save was called
        verify(measurementRepository).findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay);
        verifyNoInteractions(dailyStatsRepository);
    }

    // ========================================
    // calculateDailyStats() Tests - Full Calculation
    // ========================================

    @Test
    @DisplayName("calculateDailyStats() should calculate all statistics correctly with normal data")
    void calculateDailyStats_shouldCalculateCorrectly_withNormalData() {
        // Given: 3 measurements with normal values (no violations)
        List<Measurement> measurements = createNormalMeasurements();
        Instant startOfDay = testDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = testDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        when(measurementRepository.findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay))
                .thenReturn(measurements);
        when(dailyStatsRepository.save(any(DailyStats.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Verify voltage statistics
        assertThat(result.getDate()).isEqualTo(testDate);
        assertThat(result.getAvgVoltage()).isCloseTo(230.0, org.assertj.core.data.Offset.offset(0.01)); // (229 + 230 + 231) / 3
        assertThat(result.getMinVoltage()).isCloseTo(229.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getMaxVoltage()).isCloseTo(231.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getStdDevVoltage()).isGreaterThan(0);

        // Verify power statistics
        assertThat(result.getAvgPowerActive()).isCloseTo(1500.0, org.assertj.core.data.Offset.offset(0.01)); // (1400 + 1500 + 1600) / 3
        assertThat(result.getMinPower()).isCloseTo(1400.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getPeakPower()).isCloseTo(1600.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getTotalEnergyKwh()).isGreaterThan(0);

        // Verify frequency statistics
        assertThat(result.getAvgFrequency()).isCloseTo(50.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getMinFrequency()).isCloseTo(50.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(result.getMaxFrequency()).isCloseTo(50.0, org.assertj.core.data.Offset.offset(0.01));

        // Verify power factor
        assertThat(result.getAvgPowerFactor()).isCloseTo(0.95, org.assertj.core.data.Offset.offset(0.01)); // (0.94 + 0.95 + 0.96) / 3
        assertThat(result.getMinPowerFactor()).isCloseTo(0.94, org.assertj.core.data.Offset.offset(0.01));

        // Verify event counters (no violations)
        assertThat(result.getVoltageSagCount()).isZero();
        assertThat(result.getVoltageSwellCount()).isZero();
        assertThat(result.getInterruptionCount()).isZero();
        assertThat(result.getThdViolationsCount()).isZero();
        assertThat(result.getFrequencyDevCount()).isZero();
        assertThat(result.getPowerFactorPenaltyCount()).isZero();

        // Verify data quality
        assertThat(result.getMeasurementCount()).isEqualTo(3);
        assertThat(result.getDataCompleteness()).isGreaterThan(0);

        // Verify repository interactions
        verify(measurementRepository).findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay);
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count voltage sag events correctly with duration")
    void calculateDailyStats_shouldCountVoltageSags_correctly() {
        // Given: Two separate voltage sag events with sufficient duration (> 10ms)
        // Event 1: sag at t=0s, 3s (duration = 3s) -> counts as 1 event
        // Event 2: sag at t=9s, 12s (duration = 3s) -> counts as 1 event
        // Total: 2 events
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 205.0, 1000.0, 50.0, 0.95, 5.0),  // SAG start event 1
                createMeasurement(testDate, 3, 205.0, 1000.0, 50.0, 0.95, 5.0),  // SAG continues
                createMeasurement(testDate, 6, 230.0, 1500.0, 50.0, 0.95, 5.0),  // Normal (event 1 ends)
                createMeasurement(testDate, 9, 200.0, 1200.0, 50.0, 0.95, 5.0),  // SAG start event 2
                createMeasurement(testDate, 12, 200.0, 1200.0, 50.0, 0.95, 5.0), // SAG continues
                createMeasurement(testDate, 15, 230.0, 1500.0, 50.0, 0.95, 5.0)  // Normal (event 2 ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 2 separate voltage sag events
        assertThat(result.getVoltageSagCount()).isEqualTo(2);
        assertThat(result.getVoltageSwellCount()).isZero();
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count voltage swell events correctly with duration")
    void calculateDailyStats_shouldCountVoltageSwells_correctly() {
        // Given: One continuous voltage swell event (> 253V = 110% of 230V)
        // Event: swell at t=3s, 6s (duration = 3s) -> counts as 1 event
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 230.0, 1000.0, 50.0, 0.95, 5.0),  // Normal
                createMeasurement(testDate, 3, 254.0, 1500.0, 50.0, 0.95, 5.0),  // SWELL starts
                createMeasurement(testDate, 6, 255.0, 1200.0, 50.0, 0.95, 5.0),  // SWELL continues
                createMeasurement(testDate, 9, 230.0, 1000.0, 50.0, 0.95, 5.0)   // Normal (event ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 1 voltage swell event (continuous)
        assertThat(result.getVoltageSwellCount()).isEqualTo(1);
        assertThat(result.getVoltageSagCount()).isZero();
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count interruption events correctly with duration")
    void calculateDailyStats_shouldCountInterruptions_correctly() {
        // Given: One continuous interruption event (< 23V = 10% of 230V, duration > 0.01s)
        // Event: interruption at t=3s, 6s (duration = 3s) -> counts as 1 event
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 230.0, 1000.0, 50.0, 0.95, 5.0),  // Normal
                createMeasurement(testDate, 3, 20.0, 0.0, 50.0, 0.0, 5.0),       // INTERRUPTION starts
                createMeasurement(testDate, 6, 15.0, 0.0, 50.0, 0.0, 5.0),       // INTERRUPTION continues
                createMeasurement(testDate, 9, 230.0, 1000.0, 50.0, 0.95, 5.0)   // Normal (event ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 1 continuous interruption event
        assertThat(result.getInterruptionCount()).isEqualTo(1);
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count THD violations correctly with duration")
    void calculateDailyStats_shouldCountThdViolations_correctly() {
        // Given: One continuous THD violation event (> 8.0%)
        // Event: THD violation at t=3s, 6s (duration = 3s) -> counts as 1 event
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 230.0, 1000.0, 50.0, 0.95, 5.0),   // Normal
                createMeasurement(testDate, 3, 230.0, 1500.0, 50.0, 0.95, 9.0),   // THD violation starts
                createMeasurement(testDate, 6, 230.0, 1200.0, 50.0, 0.95, 10.0),  // THD violation continues
                createMeasurement(testDate, 9, 230.0, 1000.0, 50.0, 0.95, 5.0)    // Normal (event ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 1 continuous THD violation event
        assertThat(result.getThdViolationsCount()).isEqualTo(1);
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count frequency deviations correctly with duration")
    void calculateDailyStats_shouldCountFrequencyDeviations_correctly() {
        // Given: Two separate frequency deviation events (< 49.5 or > 50.5 Hz)
        // Event 1: low frequency at t=0s (duration = 0s but single measurement at end)
        // Event 2: high frequency at t=6s, 9s (duration = 3s) -> counts as 1 event
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 230.0, 1000.0, 49.4, 0.95, 5.0),  // Low frequency event
                createMeasurement(testDate, 3, 230.0, 1500.0, 50.0, 0.95, 5.0),  // Normal
                createMeasurement(testDate, 6, 230.0, 1200.0, 50.6, 0.95, 5.0),  // High frequency starts
                createMeasurement(testDate, 9, 230.0, 1200.0, 50.6, 0.95, 5.0),  // High frequency continues
                createMeasurement(testDate, 12, 230.0, 1500.0, 50.0, 0.95, 5.0)  // Normal (event 2 ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 2 frequency deviation events
        assertThat(result.getFrequencyDevCount()).isEqualTo(2);
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should count power factor penalties correctly with duration")
    void calculateDailyStats_shouldCountPowerFactorPenalties_correctly() {
        // Given: Two separate low power factor events (< 0.85)
        // Event 1: low PF at t=0s (duration = 0s but single measurement at end)
        // Event 2: low PF at t=6s, 9s (duration = 3s) -> counts as 1 event
        List<Measurement> measurements = List.of(
                createMeasurement(testDate, 0, 230.0, 1000.0, 50.0, 0.80, 5.0),  // Low PF event 1
                createMeasurement(testDate, 3, 230.0, 1500.0, 50.0, 0.95, 5.0),  // Normal
                createMeasurement(testDate, 6, 230.0, 1200.0, 50.0, 0.75, 5.0),  // Low PF event 2 starts
                createMeasurement(testDate, 9, 230.0, 1200.0, 50.0, 0.78, 5.0),  // Low PF continues
                createMeasurement(testDate, 12, 230.0, 1500.0, 50.0, 0.95, 5.0)  // Normal (event 2 ends)
        );
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Should count 2 power factor penalty events
        assertThat(result.getPowerFactorPenaltyCount()).isEqualTo(2);
        verify(dailyStatsRepository).save(any(DailyStats.class));
    }

    @Test
    @DisplayName("calculateDailyStats() should save entity to repository")
    void calculateDailyStats_shouldSaveEntity_toRepository() {
        // Given: Normal measurements
        List<Measurement> measurements = createNormalMeasurements();
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        statsService.calculateDailyStats(testDate);

        // Then: Should save DailyStats entity
        ArgumentCaptor<DailyStats> captor = ArgumentCaptor.forClass(DailyStats.class);
        verify(dailyStatsRepository).save(captor.capture());

        DailyStats saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(testDate);
        assertThat(saved.getAvgVoltage()).isEqualTo(230.0);
        assertThat(saved.getMeasurementCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("calculateDailyStats() should calculate data completeness correctly")
    void calculateDailyStats_shouldCalculateDataCompleteness_correctly() {
        // Given: Expected measurements = 24 * 60 * 60 / 3 = 28,800
        // Actual measurements = 3
        List<Measurement> measurements = createNormalMeasurements();
        mockRepositoryCalls(measurements);

        // When: Calculate daily stats
        StatsDTO result = statsService.calculateDailyStats(testDate);

        // Then: Data completeness = 3 / 28800 = 0.00010416...
        assertThat(result.getMeasurementCount()).isEqualTo(3);
        assertThat(result.getDataCompleteness()).isCloseTo(0.000104, org.assertj.core.data.Offset.offset(0.000001));
    }

    // ========================================
    // Helper Methods
    // ========================================

    private DailyStats createMockDailyStats(LocalDate date) {
        return DailyStats.builder()
                .id(1L)
                .date(date)
                .avgVoltage(230.0)
                .minVoltage(225.0)
                .maxVoltage(235.0)
                .stdDevVoltage(2.5)
                .avgPowerActive(1500.0)
                .minPower(1200.0)
                .peakPower(1800.0)
                .totalEnergyKwh(36.0)
                .avgPowerFactor(0.95)
                .minPowerFactor(0.90)
                .avgFrequency(50.0)
                .minFrequency(49.9)
                .maxFrequency(50.1)
                .voltageSagCount(0)
                .voltageSwellCount(0)
                .interruptionCount(0)
                .thdViolationsCount(0)
                .frequencyDevCount(0)
                .powerFactorPenaltyCount(0)
                .measurementCount(28800)
                .dataCompleteness(1.0)
                .build();
    }

    /**
     * Create 3 normal measurements with no violations.
     */
    private List<Measurement> createNormalMeasurements() {
        return List.of(
                createMeasurement(testDate, 0, 229.0, 1400.0, 50.0, 0.94, 5.0),
                createMeasurement(testDate, 3, 230.0, 1500.0, 50.0, 0.95, 5.0),
                createMeasurement(testDate, 6, 231.0, 1600.0, 50.0, 0.96, 5.0)
        );
    }

    /**
     * Create a single measurement.
     */
    private Measurement createMeasurement(LocalDate date, int secondsOffset,
                                          double voltage, double power,
                                          double frequency, double cosPhi,
                                          double thdVoltage) {
        Instant time = date.atStartOfDay(ZoneId.systemDefault()).toInstant()
                .plusSeconds(secondsOffset);
        return Measurement.builder()
                .time(time)
                .voltageRms(voltage)
                .currentRms(power / voltage) // I = P / V
                .powerActive(power)
                .powerApparent(power / cosPhi)
                .powerReactive(Math.sqrt(Math.pow(power / cosPhi, 2) - Math.pow(power, 2)))
                .cosPhi(cosPhi)
                .frequency(frequency)
                .thdVoltage(thdVoltage)
                .thdCurrent(3.0)
                .harmonicsV(new Double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0})
                .harmonicsI(new Double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0})
                .build();
    }

    /**
     * Mock repository calls for calculateDailyStats.
     */
    private void mockRepositoryCalls(List<Measurement> measurements) {
        Instant startOfDay = testDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = testDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        when(measurementRepository.findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay))
                .thenReturn(measurements);
        when(dailyStatsRepository.save(any(DailyStats.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }
}
