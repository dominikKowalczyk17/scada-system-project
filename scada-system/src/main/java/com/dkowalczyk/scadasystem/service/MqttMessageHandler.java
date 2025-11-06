package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MqttMessageHandler {

    private final MeasurementService measurementService;
    private final ObjectMapper objectMapper;

    /**
     * Obsługuje wiadomości MQTT z ESP32
     * @param message Wiadomość MQTT z kanału mqttInputChannel
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(Message<?> message) {
        try {
            String payload = (String) message.getPayload();
            String topic = (String) message.getHeaders().get("mqtt_receivedTopic");

            log.info("Received MQTT message from topic: {}", topic);
            log.debug("Payload: {}", payload);

            // Parsowanie JSON z ESP32
            MeasurementRequest request = objectMapper.readValue(payload, MeasurementRequest.class);

            // Zapis pomiaru
            measurementService.saveMeasurement(request);

            log.info("Measurement processed successfully");

        } catch (Exception e) {
            log.error("Error processing MQTT message: {}", e.getMessage(), e);
        }
    }
}