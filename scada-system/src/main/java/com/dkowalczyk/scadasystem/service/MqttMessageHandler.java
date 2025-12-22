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
     * Handles incoming MQTT messages from ESP32 measurement nodes.
     * <p>
     * Parses JSON payload, validates measurement data, and saves to database
     * via MeasurementService. Triggered automatically when messages arrive on
     * the mqttInputChannel.
     *
     * @param message MQTT message from mqttInputChannel containing JSON measurement data
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(Message<?> message) {
        try {
            String payload = (String) message.getPayload();
            String topic = (String) message.getHeaders().get("mqtt_receivedTopic");

            log.info("Received MQTT message from topic: {}", topic);
            log.debug("Payload: {}", payload);

            // Parse JSON from ESP32
            MeasurementRequest request = objectMapper.readValue(payload, MeasurementRequest.class);

            // Save measurement
            measurementService.saveMeasurement(request);
            log.info("Measurement processed successfully");

        } catch (Exception e) {
            log.error("Error processing MQTT message: {}", e.getMessage(), e);
        }
    }
}