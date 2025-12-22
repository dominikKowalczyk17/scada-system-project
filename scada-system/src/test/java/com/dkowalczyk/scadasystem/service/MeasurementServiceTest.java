package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.model.dto.PowerQualityIndicatorsDTO;
import com.dkowalczyk.scadasystem.model.dto.ValidationResult;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MeasurementServiceTest {

    @Mock
    private MeasurementRepository repository;
    @Mock
    private WebSocketService webSocketService;
    @Mock
    private WaveformService waveformService;
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock
    private MeasurementValidator validator;

    @InjectMocks
    private MeasurementService measurementService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getLatestPowerQualityIndicators_returnsDtoWhenMeasurementExists() {
        Measurement measurement = Measurement.builder()
            .time(Instant.now())
            .voltageRms(230.0)
            .frequency(50.0)
            .thdVoltage(5.0)
            .harmonicsV(new Double[]{1.0, 2.0, 3.0})
            .voltageDeviationPercent(0.0)
            .frequencyDeviationHz(0.0)
            .build();
        when(repository.findTopByIsValidTrueOrderByTimeDesc()).thenReturn(Optional.of(measurement));

        Optional<PowerQualityIndicatorsDTO> result = measurementService.getLatestPowerQualityIndicators();

        assertThat(result).isPresent();
        PowerQualityIndicatorsDTO dto = result.get();
        assertThat(dto.getVoltageRms()).isEqualTo(230.0);
        assertThat(dto.getFrequency()).isEqualTo(50.0);
        assertThat(dto.getThdVoltage()).isEqualTo(5.0);
        assertThat(dto.getVoltageWithinLimits()).isTrue();
        assertThat(dto.getFrequencyWithinLimits()).isTrue();
        assertThat(dto.getThdWithinLimits()).isTrue();
        assertThat(dto.getOverallCompliant()).isTrue();
        assertThat(dto.getStatusMessage()).contains("within PN-EN 50160");
    }

    @Test
    void getLatestPowerQualityIndicators_returnsEmptyWhenNoMeasurement() {
        when(repository.findTopByIsValidTrueOrderByTimeDesc()).thenReturn(Optional.empty());
        Optional<PowerQualityIndicatorsDTO> result = measurementService.getLatestPowerQualityIndicators();
        assertThat(result).isNotPresent();
    }

    @Test
    void getLatestPowerQualityIndicators_nonCompliantStatus() {
        Measurement measurement = Measurement.builder()
            .time(Instant.now())
            .voltageRms(205.0) // deviation < -10%
            .frequency(49.0)   // deviation > 0.5Hz
            .thdVoltage(10.0)  // > 8%
            .harmonicsV(new Double[]{1.0, 2.0, 3.0})
            .voltageDeviationPercent(-10.869565217391305) // (205-230)/230*100
            .frequencyDeviationHz(-1.0) // 49-50
            .build();
        when(repository.findTopByIsValidTrueOrderByTimeDesc()).thenReturn(Optional.of(measurement));

        Optional<PowerQualityIndicatorsDTO> result = measurementService.getLatestPowerQualityIndicators();
        assertThat(result).isPresent();
        PowerQualityIndicatorsDTO dto = result.get();
        assertThat(dto.getVoltageWithinLimits()).isFalse();
        assertThat(dto.getFrequencyWithinLimits()).isFalse();
        assertThat(dto.getThdWithinLimits()).isFalse();
        assertThat(dto.getOverallCompliant()).isFalse();
        assertThat(dto.getStatusMessage()).contains("Non-compliant");
    }

    @Test
    void saveMeasurement_withoutTimestamp_usesServerTime() {
        // Given: MeasurementRequest without timestamp
        MeasurementRequest request = new MeasurementRequest();
        request.setVoltageRms(230.0);
        request.setCurrentRms(5.0);
        request.setFrequency(50.0);
        // timestamp is null

        Measurement savedMeasurement = Measurement.builder()
            .id(1L)
            .time(Instant.now())
            .voltageRms(230.0)
            .currentRms(5.0)
            .frequency(50.0)
            .voltageDeviationPercent(0.0)
            .frequencyDeviationHz(0.0)
            .isValid(true)
            .build();

        when(validator.validate(any())).thenReturn(new ValidationResult(true, Collections.emptyList(), Collections.emptyList()));
        when(repository.save(any(Measurement.class))).thenReturn(savedMeasurement);

        // When
        Instant beforeCall = Instant.now();
        MeasurementDTO result = measurementService.saveMeasurement(request);
        Instant afterCall = Instant.now();

        // Then
        ArgumentCaptor<Measurement> measurementCaptor = ArgumentCaptor.forClass(Measurement.class);
        verify(repository).save(measurementCaptor.capture());
        Measurement capturedMeasurement = measurementCaptor.getValue();

        assertThat(capturedMeasurement.getTime()).isNotNull();
        assertThat(capturedMeasurement.getTime())
            .isAfterOrEqualTo(beforeCall)
            .isBeforeOrEqualTo(afterCall);
        assertThat(result).isNotNull();
    }

    @Test
    void saveMeasurement_withTimestamp_usesProvidedTime() {
        // Given: MeasurementRequest with explicit timestamp
        Long expectedTimestamp = 1702901234L;
        MeasurementRequest request = new MeasurementRequest();
        request.setTimestamp(expectedTimestamp);
        request.setVoltageRms(230.0);
        request.setCurrentRms(5.0);
        request.setFrequency(50.0);

        Measurement savedMeasurement = Measurement.builder()
            .id(1L)
            .time(Instant.ofEpochSecond(expectedTimestamp))
            .voltageRms(230.0)
            .currentRms(5.0)
            .frequency(50.0)
            .voltageDeviationPercent(0.0)
            .frequencyDeviationHz(0.0)
            .isValid(true)
            .build();

        when(validator.validate(any())).thenReturn(new ValidationResult(true, Collections.emptyList(), Collections.emptyList()));
        when(repository.save(any(Measurement.class))).thenReturn(savedMeasurement);

        // When
        MeasurementDTO result = measurementService.saveMeasurement(request);

        // Then
        ArgumentCaptor<Measurement> measurementCaptor = ArgumentCaptor.forClass(Measurement.class);
        verify(repository).save(measurementCaptor.capture());
        Measurement capturedMeasurement = measurementCaptor.getValue();

        assertThat(capturedMeasurement.getTime())
            .isEqualTo(Instant.ofEpochSecond(expectedTimestamp));
        assertThat(result).isNotNull();
    }
}
