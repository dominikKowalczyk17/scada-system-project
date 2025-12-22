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

import com.dkowalczyk.scadasystem.repository.DailyStatsRepository;
import com.dkowalczyk.scadasystem.service.DataAggregationService;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import com.dkowalczyk.scadasystem.service.StatsService;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    @MockitoBean
    protected DailyStatsRepository dailyStatsRepository;

    @BeforeEach
    void setupDefaultValidation() {
        lenient().when(statsService.getsStatsInDataRange(any(), any()))
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
