package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.model.event.MeasurementSavedEvent;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import com.dkowalczyk.scadasystem.util.Constants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeasurementService {

    private final MeasurementRepository repository;
    private final WebSocketService webSocketService;
    private final WaveformService waveformService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Helper method to reconstruct voltage and current waveforms from harmonics.
     * <p>
     * WHY EXTRACTED: This logic is reused in both getDashboardData() and broadcastAfterCommit()
     * to avoid code duplication.
     */
    private WaveformDTO reconstructWaveforms(Measurement measurement) {
        double frequency = measurement.getFrequency() != null ? measurement.getFrequency() : 50.0;
        double[] voltageWaveform = waveformService.reconstructWaveform(
                measurement.getHarmonicsV(), frequency, 200);
        double[] currentWaveform = waveformService.reconstructWaveform(
                measurement.getHarmonicsI(), frequency, 200);

        return WaveformDTO.builder()
                .voltage(voltageWaveform)
                .current(currentWaveform)
                .build();
    }

    /**
     * Calculates PN-EN 50160 power quality indicators from raw measurement data.
     * <p>
     * This method computes voltage and frequency deviations according to PN-EN 50160 standard:
     * - Group 1: Voltage deviation from declared value (230V nominal)
     * - Group 2: Frequency deviation from nominal (50 Hz)
     * <p>
     * WHY IN SERVICE LAYER:
     * - Keeps business logic centralized
     * - Calculations are consistent across all code paths
     * - Easy to test in isolation
     * - ESP32 sends raw measurements, backend calculates indicators
     *
     * @param measurement Raw measurement data with voltageRms and frequency
     */
    private void calculatePowerQualityIndicators(Measurement measurement) {
        // PN-EN 50160 Group 1: Voltage deviation
        // Formula: (U_measured - U_nominal) / U_nominal * 100%
        if (measurement.getVoltageRms() != null) {
            double deviation = ((measurement.getVoltageRms() - Constants.NOMINAL_VOLTAGE)
                    / Constants.NOMINAL_VOLTAGE) * 100.0;
            measurement.setVoltageDeviationPercent(deviation);
            log.debug("Calculated voltage deviation: {}% (U_rms={}V)",
                    String.format("%.2f", deviation), measurement.getVoltageRms());
        }

        // PN-EN 50160 Group 2: Frequency deviation
        // Formula: f_measured - f_nominal
        if (measurement.getFrequency() != null) {
            double deviation = measurement.getFrequency() - Constants.NOMINAL_FREQUENCY;
            measurement.setFrequencyDeviationHz(deviation);
            log.debug("Calculated frequency deviation: {} Hz (f={}Hz)",
                    String.format("%.3f", deviation), measurement.getFrequency());
        }

        // Note: THD and harmonics (Group 4) are already calculated by ESP32 via FFT/DFT
        // Note: Event detection (Group 5: voltage dips, interruptions) implemented separately
    }

    /**
     * Saves a new measurement to the database and triggers WebSocket broadcast.
     * <p>
     * WHY SEPARATE EVENT PUBLISHING:
     * - WebSocket broadcasts happen AFTER transaction commit via @TransactionalEventListener
     * - This keeps the transaction short (only database write)
     * - Expensive waveform reconstruction doesn't block the transaction
     * - If transaction rolls back, no broadcasts are sent (data consistency)
     * <p>
     * WHY CALCULATE INDICATORS HERE:
     * - Indicators are calculated from raw measurements before saving
     * - Ensures all records have consistent indicator values
     * - Backend is single source of truth for PN-EN 50160 calculations
     */
    @Transactional
    public MeasurementDTO saveMeasurement(MeasurementRequest request) {
        // Konwersja DTO → Entity
        if (request.getTimestamp() == null) {
            throw new IllegalArgumentException("timestamp must be provided");
        }
        Instant timestamp = Instant.ofEpochSecond(request.getTimestamp());
        Measurement measurement = Measurement.builder()
                .time(timestamp)
                .voltageRms(request.getVoltageRms())
                .currentRms(request.getCurrentRms())
                .powerActive(request.getPowerActive())
                .powerApparent(request.getPowerApparent())
                .powerReactive(request.getPowerReactive())
                .cosPhi(request.getCosPhi())
                .frequency(request.getFrequency())
                .thdVoltage(request.getThdVoltage())
                .thdCurrent(request.getThdCurrent())
                .harmonicsV(request.getHarmonicsV())
                .harmonicsI(request.getHarmonicsI())
                .build();

        // Calculate PN-EN 50160 power quality indicators
        calculatePowerQualityIndicators(measurement);

        // Zapis do bazy
        Measurement saved = repository.save(measurement);
        log.info("Saved measurement: id={}, voltage={}, current={}, voltage_deviation={}%, frequency_deviation={}Hz",
                saved.getId(), saved.getVoltageRms(), saved.getCurrentRms(),
                saved.getVoltageDeviationPercent() != null ? String.format("%.2f", saved.getVoltageDeviationPercent()) : "null",
                saved.getFrequencyDeviationHz() != null ? String.format("%.3f", saved.getFrequencyDeviationHz()) : "null");

        // Konwersja Entity → DTO
        MeasurementDTO dto = toDTO(saved);

        // Publish event - listener will broadcast after transaction commits
        eventPublisher.publishEvent(new MeasurementSavedEvent(this, saved, dto));

        return dto;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void broadcastAfterCommit(MeasurementSavedEvent event) {
        // Broadcast poza transakcją
        WaveformDTO waveforms = reconstructWaveforms(event.getMeasurement());
        webSocketService.broadcastMeasurement(event.getDto());

        RealtimeDashboardDTO realtimeDashboard = RealtimeDashboardDTO.builder()
                .latestMeasurement(event.getDto())
                .waveforms(waveforms)
                .build();
        webSocketService.broadcastRealtimeDashboard(realtimeDashboard);
    }

    public Optional<MeasurementDTO> getLatestMeasurement() {
        return repository.findTopByOrderByTimeDesc()
                .map(this::toDTO);
    }

    /**
     * Get latest measurement entity (for internal use by controllers).
     * Used when controller needs access to full entity (e.g., for power quality indicators).
     */
    public Optional<Measurement> getLatestMeasurementEntity() {
        return repository.findTopByOrderByTimeDesc();
    }

    public List<MeasurementDTO> getHistory(Instant from, Instant to, int limit) {
        return repository.findByTimeBetweenOrderByTimeDesc(from, to)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Pobiera dane dla głównego dashboardu (unified endpoint).
     * <p>
     * WHY: Zamiast 3 osobnych requestów (latest + history + waveforms),
     * frontend robi 1 request i dostaje wszystko.
     *
     * @return DashboardDTO z najnowszym pomiarem, przebiegami i historią
     */
    public Optional<DashboardDTO> getDashboardData() {
        // 1. Pobierz ostatni pomiar
        Optional<Measurement> latestMeasurement = repository.findTopByOrderByTimeDesc();
        if (latestMeasurement.isEmpty()) {
            log.warn("No measurements found in database for dashboard");
            return Optional.empty();
        }

        Measurement latest = latestMeasurement.get();
        MeasurementDTO latestDTO = toDTO(latest);

        // 2. Rekonstruuj przebiegi z harmonicznych
        WaveformDTO waveforms = reconstructWaveforms(latest);

        // 3. Pobierz ostatnie 100 pomiarów (historia)
        List<MeasurementDTO> recentHistory = repository.findTop100ByOrderByTimeDesc()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        // 4. Zbuduj DashboardDTO
        DashboardDTO dashboard = DashboardDTO.builder()
                .latestMeasurement(latestDTO)
                .waveforms(waveforms)
                .recentHistory(recentHistory)
                .build();

        log.debug("Dashboard data prepared: latest={}, history size={}",
                latest.getId(), recentHistory.size());

        return Optional.of(dashboard);
    }

    private MeasurementDTO toDTO(Measurement entity) {
        return MeasurementDTO.builder()
                .id(entity.getId())
                .time(entity.getTime())
                .voltageRms(entity.getVoltageRms())
                .currentRms(entity.getCurrentRms())
                .powerActive(entity.getPowerActive())
                .powerApparent(entity.getPowerApparent())
                .powerReactive(entity.getPowerReactive())
                .cosPhi(entity.getCosPhi())
                .frequency(entity.getFrequency())
                .thdVoltage(entity.getThdVoltage())
                .thdCurrent(entity.getThdCurrent())
                .harmonicsV(entity.getHarmonicsV())
                .harmonicsI(entity.getHarmonicsI())
                .voltageDeviationPercent(entity.getVoltageDeviationPercent())
                .frequencyDeviationHz(entity.getFrequencyDeviationHz())
                .build();
    }
}