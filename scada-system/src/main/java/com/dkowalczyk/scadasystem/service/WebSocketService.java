package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.dto.RealtimeDashboardDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcasts simple measurement (legacy - for backward compatibility)
     */
    public void broadcastMeasurement(MeasurementDTO measurement) {
        messagingTemplate.convertAndSend("/topic/measurements", measurement);
    }

    /**
     * Broadcasts real-time dashboard data with waveforms.
     * <p>
     * WHY: Frontend needs both measurement values AND reconstructed waveforms
     * for displaying sine wave graph in real-time (updated every 6s).
     * <p>
     * Topic: /topic/dashboard
     *
     * @param dashboard Real-time dashboard DTO with measurement + waveforms
     */
    public void broadcastRealtimeDashboard(RealtimeDashboardDTO dashboard) {
        messagingTemplate.convertAndSend("/topic/dashboard", dashboard);
    }
}