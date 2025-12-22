package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.dto.RealtimeDashboardDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for broadcasting real-time measurement data to WebSocket clients.
 *
 * <p>Publishes dashboard updates (measurements + waveforms) to /topic/dashboard
 * for real-time frontend display. Updates sent every 6 seconds when ESP32 publishes via MQTT.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /** Broadcasts simple measurement (legacy - for backward compatibility). */
    public void broadcastMeasurement(MeasurementDTO measurement) {
        messagingTemplate.convertAndSend("/topic/measurements", measurement);
    }

    /**
     * Broadcasts real-time dashboard data with reconstructed waveforms to /topic/dashboard.
     *
     * @param dashboard measurement values + voltage/current waveforms for frontend graph display
     */
    public void broadcastRealtimeDashboard(RealtimeDashboardDTO dashboard) {
        messagingTemplate.convertAndSend("/topic/dashboard", dashboard);
    }
}