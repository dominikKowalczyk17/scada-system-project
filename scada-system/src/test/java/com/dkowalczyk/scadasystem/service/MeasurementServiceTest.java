package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.PowerQualityIndicatorsDTO;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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
}
