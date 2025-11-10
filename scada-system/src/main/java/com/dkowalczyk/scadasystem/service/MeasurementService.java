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

        // Broadcast przez WebSocket
        webSocketService.broadcastMeasurement(dto);

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