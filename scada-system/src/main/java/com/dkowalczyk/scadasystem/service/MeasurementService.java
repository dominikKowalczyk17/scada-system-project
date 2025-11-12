package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Zapis do bazy
        Measurement saved = repository.save(measurement);
        log.info("Saved measurement: id={}, voltage={}, current={}",
                saved.getId(), saved.getVoltageRms(), saved.getCurrentRms());

        // Konwersja Entity → DTO
        MeasurementDTO dto = toDTO(saved);

        // Broadcast przez WebSocket (stary - dla kompatybilności)
        webSocketService.broadcastMeasurement(dto);

        // Broadcast real-time dashboard z przebiegami
        double frequency = saved.getFrequency() != null ? saved.getFrequency() : 50.0;
        double[] voltageWaveform = waveformService.reconstructWaveform(
                saved.getHarmonicsV(), frequency, 200);
        double[] currentWaveform = waveformService.reconstructWaveform(
                saved.getHarmonicsI(), frequency, 200);

        WaveformDTO waveforms = WaveformDTO.builder()
                .voltage(voltageWaveform)
                .current(currentWaveform)
                .build();

        RealtimeDashboardDTO realtimeDashboard = RealtimeDashboardDTO.builder()
                .latestMeasurement(dto)
                .waveforms(waveforms)
                .build();

        webSocketService.broadcastRealtimeDashboard(realtimeDashboard);

        return dto;
    }

    public Optional<MeasurementDTO> getLatestMeasurement() {
        return repository.findTopByOrderByTimeDesc()
                .map(this::toDTO);
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
        double frequency = latest.getFrequency() != null ? latest.getFrequency() : 50.0;
        double[] voltageWaveform = waveformService.reconstructWaveform(
                latest.getHarmonicsV(), frequency, 200);
        double[] currentWaveform = waveformService.reconstructWaveform(
                latest.getHarmonicsI(), frequency, 200);

        WaveformDTO waveforms = WaveformDTO.builder()
                .voltage(voltageWaveform)
                .current(currentWaveform)
                .build();

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
                .build();
    }
}