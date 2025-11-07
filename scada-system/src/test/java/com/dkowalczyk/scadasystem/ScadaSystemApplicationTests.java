package com.dkowalczyk.scadasystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Basic integration test to verify Spring application context loads successfully.
 * Uses 'test' profile which configures H2 in-memory database instead of PostgreSQL.
 * MQTT beans are mocked to avoid requiring an actual MQTT broker in test environment.
 */
@SpringBootTest
@ActiveProfiles("test")
class ScadaSystemApplicationTests {

	/**
	 * Mock MQTT client factory to prevent actual broker connection attempts during tests.
	 * The @MockitoBean annotation replaces the real bean in the application context.
	 */
	@MockitoBean
	private DefaultMqttPahoClientFactory mqttClientFactory;

	/**
	 * Verifies that the Spring application context loads without errors.
	 * This is a smoke test ensuring all beans are properly configured.
	 */
	@Test
	void contextLoads() {
		// If this test passes, Spring Boot successfully created the application context
		// with all beans, configurations, and dependencies properly wired
	}

}
