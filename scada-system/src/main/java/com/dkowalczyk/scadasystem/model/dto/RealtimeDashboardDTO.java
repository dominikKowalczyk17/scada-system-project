package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO for real-time dashboard updates via WebSocket.
 * <p>
 * WHY: Frontend needs lightweight updates every 6 seconds with:
 * - Current measurement values (voltage, current, power, THD)
 * - Voltage/current waveforms reconstructed from harmonics (for sine wave graph)
 * <p>
 * This DTO does NOT include recentHistory (unlike DashboardDTO) to minimize
 * bandwidth usage for real-time WebSocket broadcasts.
 * <p>
 * Usage:
 * - WebSocket: Real-time updates (every 6s when new MQTT message arrives)
 * - NOT for REST API (use DashboardDTO instead)
 */
@Data
@Builder
public class RealtimeDashboardDTO {
    private MeasurementDTO latestMeasurement;
    private WaveformDTO waveforms;
}
