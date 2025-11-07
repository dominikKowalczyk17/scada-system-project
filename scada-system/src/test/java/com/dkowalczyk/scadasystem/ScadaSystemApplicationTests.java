package com.dkowalczyk.scadasystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic integration test to verify Spring application context loads successfully.
 * Uses 'test' profile which configures H2 in-memory database instead of PostgreSQL.
 */
@SpringBootTest
@ActiveProfiles("test")
class ScadaSystemApplicationTests {

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
