package com.dkowalczyk.scadasystem;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Base class for integration tests with full Spring application context.
 *
 * <p>Loads complete application context including all beans, repositories, and services.
 * Uses H2 in-memory database and disables MQTT via "test" profile. Slower than unit tests
 * but validates end-to-end behavior.
 *
 * <p>Example usage:
 * <pre>
 * class DashboardIntegrationTest extends BaseIntegrationTest {
 *     &#64;Autowired
 *     private MeasurementRepository repository;
 *
 *     &#64;Test
 *     void shouldReturnDashboardDataFromRealService() throws Exception {
 *         // Test with real services and database
 *         mockMvc.perform(get("/api/dashboard"))
 *             .andExpect(status().isOk());
 *     }
 * }
 * </pre>
 *
 * @see BaseRepositoryTest for JPA-only tests
 * @see BaseServiceTest for service layer tests
 * @see BaseControllerTest for controller tests with mocked services
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;
}
