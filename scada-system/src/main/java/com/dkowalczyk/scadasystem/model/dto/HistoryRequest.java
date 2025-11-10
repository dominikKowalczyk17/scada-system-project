package com.dkowalczyk.scadasystem.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Request DTO for querying daily statistics history within a date range.
 *
 * Used by GET /api/stats/history endpoint to fetch statistics
 * between specified from/to dates.
 */
@Data
public class HistoryRequest {

    /**
     * Start date (inclusive) for statistics query.
     * Example: 2025-11-01
     */
    @NotNull(message = "from date is required")
    private LocalDate from;

    /**
     * End date (inclusive) for statistics query.
     * Example: 2025-11-07
     */
    @NotNull(message = "to date is required")
    private LocalDate to;
}
