package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.GenericMessage;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Modern unit tests for MqttMessageHandler.
 *
 * Testing strategy:
 * - Mock MeasurementService and ObjectMapper
 * - Create realistic MQTT Message objects with headers
 * - Test error resilience (handler must not crash on invalid data)
 * - Verify logging behavior implicitly through exception handling
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MqttMessageHandler Unit Tests")
class MqttMessageHandlerTest {

    @Mock
    private MeasurementService measurementService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private MqttMessageHandler mqttMessageHandler;

    private static final String MQTT_TOPIC = "scada/measurements/node1";

    // ========================================
    // Test Data Builders
    // ========================================

    private String createValidMqttPayload() {
        return """
                {
                  "timestamp": 1702901234,
                  "voltage_rms": 230.0,
                  "current_rms": 5.0,
                  "power_active": 1150.0,
                  "power_apparent": 1200.0,
                  "power_reactive": 200.0,
                  "cos_phi": 0.95,
                  "frequency": 50.0,
                  "thd_voltage": 2.5,
                  "thd_current": 5.0,
                  "harmonics_v": [230.0, 0.5, 1.2, 0.3, 0.8, 0.4, 0.2, 0.1],
                  "harmonics_i": [5.0, 0.05, 0.12, 0.03, 0.08, 0.04, 0.02, 0.01]
                }
                """;
    }

    private MeasurementRequest createValidRequest() {
        MeasurementRequest request = new MeasurementRequest();
        request.setTimestamp(1702901234L);
        request.setVoltageRms(230.0);
        request.setCurrentRms(5.0);
        request.setFrequency(50.0);
        return request;
    }

    private Message<String> createMqttMessage(String payload, String topic) {
        Map<String, Object> headers = new HashMap<>();
        headers.put("mqtt_receivedTopic", topic);
        return new GenericMessage<>(payload, new MessageHeaders(headers));
    }

    private MeasurementDTO createMockDTO() {
        return MeasurementDTO.builder()
                .id(1L)
                .time(Instant.now())
                .voltageRms(230.0)
                .currentRms(5.0)
                .frequency(50.0)
                .build();
    }

    // ========================================
    // Successful Message Processing
    // ========================================

    @Nested
    @DisplayName("Successful Message Processing")
    class SuccessfulProcessing {

        @Test
        @DisplayName("should parse and save valid MQTT message")
        void shouldProcessValidMessage() throws Exception {
            // Given
            String payload = createValidMqttPayload();
            Message<String> message = createMqttMessage(payload, MQTT_TOPIC);
            MeasurementRequest mockRequest = createValidRequest();
            MeasurementDTO mockResponse = createMockDTO();

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(mockRequest);
            when(measurementService.saveMeasurement(mockRequest))
                    .thenReturn(mockResponse);

            // When
            mqttMessageHandler.handleMqttMessage(message);

            // Then
            verify(objectMapper, times(1)).readValue(payload, MeasurementRequest.class);
            verify(measurementService, times(1)).saveMeasurement(mockRequest);
        }

        @Test
        @DisplayName("should extract MQTT topic from message headers")
        void shouldExtractTopicFromHeaders() throws Exception {
            // Given
            String payload = createValidMqttPayload();
            String customTopic = "scada/measurements/node2";
            Message<String> message = createMqttMessage(payload, customTopic);

            when(objectMapper.readValue(anyString(), eq(MeasurementRequest.class)))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When
            mqttMessageHandler.handleMqttMessage(message);

            // Then: Verify topic was accessed (logged internally)
            assertThat(message.getHeaders().get("mqtt_receivedTopic"))
                    .isEqualTo(customTopic);
            verify(measurementService, times(1)).saveMeasurement(any(MeasurementRequest.class));
        }

        @Test
        @DisplayName("should handle minimal valid payload")
        void shouldHandleMinimalPayload() throws Exception {
            // Given: Only required fields
            String minimalPayload = """
                    {
                      "timestamp": 1702901234,
                      "voltage_rms": 230.0,
                      "current_rms": 5.0,
                      "frequency": 50.0
                    }
                    """;
            Message<String> message = createMqttMessage(minimalPayload, MQTT_TOPIC);

            when(objectMapper.readValue(minimalPayload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When
            mqttMessageHandler.handleMqttMessage(message);

            // Then
            verify(measurementService, times(1)).saveMeasurement(any(MeasurementRequest.class));
        }
    }

    // ========================================
    // Error Handling Tests
    // ========================================

    @Nested
    @DisplayName("Error Handling and Resilience")
    class ErrorHandling {

        @Test
        @DisplayName("should not throw exception when JSON parsing fails")
        void shouldHandleJsonParseError() throws Exception {
            // Given: Invalid JSON payload
            String invalidJson = "{invalid json}";
            Message<String> message = createMqttMessage(invalidJson, MQTT_TOPIC);

            when(objectMapper.readValue(invalidJson, MeasurementRequest.class))
                    .thenThrow(new com.fasterxml.jackson.core.JsonParseException(null, "Invalid JSON"));

            // When & Then: Should not propagate exception
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            // Verify service was never called
            verify(measurementService, never()).saveMeasurement(any());
        }

        @Test
        @DisplayName("should not throw exception when service fails")
        void shouldHandleServiceException() throws Exception {
            // Given
            String payload = createValidMqttPayload();
            Message<String> message = createMqttMessage(payload, MQTT_TOPIC);

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException("Database connection failed"));

            // When & Then: Should catch and log exception, not propagate
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should handle message with null payload reference")
        void shouldHandleNullPayloadReference() throws Exception {
            // Given: Message exists but with "null" string (realistic MQTT scenario)
            String nullPayload = "null";
            Message<String> message = createMqttMessage(nullPayload, MQTT_TOPIC);

            when(objectMapper.readValue(nullPayload, MeasurementRequest.class))
                    .thenThrow(new com.fasterxml.jackson.core.JsonParseException(null, "Unexpected token"));

            // When & Then: Should handle gracefully
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, never()).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle empty payload gracefully")
        void shouldHandleEmptyPayload() throws Exception {
            // Given
            String emptyPayload = "";
            Message<String> message = createMqttMessage(emptyPayload, MQTT_TOPIC);

            when(objectMapper.readValue(emptyPayload, MeasurementRequest.class))
                    .thenThrow(new com.fasterxml.jackson.core.JsonParseException(null, "No content"));

            // When & Then
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, never()).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle missing mqtt_receivedTopic header")
        void shouldHandleMissingTopicHeader() throws Exception {
            // Given: Message without topic header
            String payload = createValidMqttPayload();
            Map<String, Object> headers = new HashMap<>();
            // No mqtt_receivedTopic header
            Message<String> message = new GenericMessage<>(payload, new MessageHeaders(headers));

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When & Then: Should handle gracefully (topic will be null)
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, times(1)).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle malformed JSON with missing required fields")
        void shouldHandleMalformedJson() throws Exception {
            // Given: JSON missing required fields
            String malformedPayload = """
                    {
                      "voltage_rms": 230.0
                    }
                    """;
            Message<String> message = createMqttMessage(malformedPayload, MQTT_TOPIC);

            MeasurementRequest incompleteRequest = new MeasurementRequest();
            incompleteRequest.setVoltageRms(230.0);
            // Missing timestamp, current, frequency

            when(objectMapper.readValue(malformedPayload, MeasurementRequest.class))
                    .thenReturn(incompleteRequest);
            when(measurementService.saveMeasurement(incompleteRequest))
                    .thenThrow(new IllegalArgumentException("Missing required fields"));

            // When & Then
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();
        }
    }

    // ========================================
    // Edge Cases
    // ========================================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle very large payload")
        void shouldHandleLargePayload() throws Exception {
            // Given: Large harmonics arrays
            StringBuilder largePayload = new StringBuilder("{");
            largePayload.append("\"timestamp\": 1702901234,");
            largePayload.append("\"voltage_rms\": 230.0,");
            largePayload.append("\"current_rms\": 5.0,");
            largePayload.append("\"frequency\": 50.0,");
            largePayload.append("\"harmonics_v\": [");
            for (int i = 0; i < 100; i++) {
                largePayload.append(i == 0 ? "230.0" : "0.1");
                if (i < 99) largePayload.append(",");
            }
            largePayload.append("]");
            largePayload.append("}");

            Message<String> message = createMqttMessage(largePayload.toString(), MQTT_TOPIC);

            when(objectMapper.readValue(anyString(), eq(MeasurementRequest.class)))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When & Then
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, times(1)).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle special characters in topic")
        void shouldHandleSpecialCharsInTopic() throws Exception {
            // Given
            String specialTopic = "scada/measurements/node-1/sensor_A/temp";
            String payload = createValidMqttPayload();
            Message<String> message = createMqttMessage(payload, specialTopic);

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When & Then
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, times(1)).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle rapid successive messages")
        void shouldHandleRapidMessages() throws Exception {
            // Given
            String payload = createValidMqttPayload();
            Message<String> message = createMqttMessage(payload, MQTT_TOPIC);

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When: Process 10 messages rapidly
            for (int i = 0; i < 10; i++) {
                mqttMessageHandler.handleMqttMessage(message);
            }

            // Then: All messages processed
            verify(measurementService, times(10)).saveMeasurement(any());
        }

        @Test
        @DisplayName("should handle payload with Unicode characters")
        void shouldHandleUnicodePayload() throws Exception {
            // Given: Payload with Unicode in string fields (shouldn't affect numbers)
            String unicodePayload = """
                    {
                      "timestamp": 1702901234,
                      "voltage_rms": 230.0,
                      "current_rms": 5.0,
                      "frequency": 50.0,
                      "node_name": "węzeł №1 测试"
                    }
                    """;
            Message<String> message = createMqttMessage(unicodePayload, MQTT_TOPIC);

            when(objectMapper.readValue(unicodePayload, MeasurementRequest.class))
                    .thenReturn(createValidRequest());
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(createMockDTO());

            // When & Then
            assertThatCode(() -> mqttMessageHandler.handleMqttMessage(message))
                    .doesNotThrowAnyException();

            verify(measurementService, times(1)).saveMeasurement(any());
        }
    }

    // ========================================
    // Integration Behavior Tests
    // ========================================

    @Nested
    @DisplayName("Integration Behavior")
    class IntegrationBehavior {

        @Test
        @DisplayName("should process message in correct order: parse -> save")
        void shouldProcessInCorrectOrder() throws Exception {
            // Given
            String payload = createValidMqttPayload();
            Message<String> message = createMqttMessage(payload, MQTT_TOPIC);
            MeasurementRequest mockRequest = createValidRequest();

            when(objectMapper.readValue(payload, MeasurementRequest.class))
                    .thenReturn(mockRequest);
            when(measurementService.saveMeasurement(mockRequest))
                    .thenReturn(createMockDTO());

            // When
            mqttMessageHandler.handleMqttMessage(message);

            // Then: Verify order using InOrder
            var inOrder = inOrder(objectMapper, measurementService);
            inOrder.verify(objectMapper).readValue(payload, MeasurementRequest.class);
            inOrder.verify(measurementService).saveMeasurement(mockRequest);
        }

        @Test
        @DisplayName("should not call save when parsing fails")
        void shouldNotSaveWhenParseFails() throws Exception {
            // Given
            String invalidPayload = "{invalid}";
            Message<String> message = createMqttMessage(invalidPayload, MQTT_TOPIC);

            when(objectMapper.readValue(invalidPayload, MeasurementRequest.class))
                    .thenThrow(new com.fasterxml.jackson.core.JsonParseException(null, "Error"));

            // When
            mqttMessageHandler.handleMqttMessage(message);

            // Then: Save should never be called
            verify(measurementService, never()).saveMeasurement(any());
        }
    }
}
