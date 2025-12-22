package com.dkowalczyk.scadasystem;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.dkowalczyk.scadasystem.service.DataAggregationService;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import com.dkowalczyk.scadasystem.service.StatsService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Base class for REST controller tests using MockMvc with mocked services.
 *
 * <p>Loads only web layer ({@code @WebMvcTest}) with all service dependencies mocked.
 * Provides pre-configured validation behavior for {@code StatsService.getStatsInDateRange()}
 * that validates date parameters (order, future dates, 365-day limit).
 *
 * <p>Example usage:
 * <pre>
 * &#64;WebMvcTest(MeasurementController.class)
 * class MeasurementControllerTest extends BaseControllerTest {
 *     &#64;Test
 *     void shouldReturnMeasurements() throws Exception {
 *         when(measurementService.getLatest(10))
 *             .thenReturn(List.of(new Measurement()));
 *
 *         mockMvc.perform(get("/api/measurements/latest")
 *                 .param("limit", "10"))
 *             .andExpect(status().isOk())
 *             .andExpect(jsonPath("$.data").isArray());
 *     }
 * }
 * </pre>
 *
 * @see BaseRepositoryTest for repository tests
 * @see BaseServiceTest for service layer tests
 * @see BaseIntegrationTest for full context tests
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@WebMvcTest
@ActiveProfiles("test")
public abstract class BaseControllerTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @MockitoBean
    protected StatsService statsService;

    @MockitoBean
    protected MeasurementService measurementService;

    @MockitoBean
    protected DataAggregationService dataAggregationService;

    @BeforeEach
    void setupDefaultValidation() {
        lenient().when(statsService.getStatsInDateRange(any(), any()))
                .thenAnswer(invocation -> {
                    LocalDate from = invocation.getArgument(0);
                    LocalDate to = invocation.getArgument(1);

                    if (from.isAfter(to)) {
                        throw new IllegalArgumentException("From date must be before or equal to To date");
                    }
                    if (from.isAfter(LocalDate.now())) {
                        throw new IllegalArgumentException("'from' date cannot be in the future");
                    }
                    if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > 365) {
                        throw new IllegalArgumentException("Date range cannot exceed 365 days");
                    }
                    return List.of();
                });
    }
}
