package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@Tag(name = "Statistics", description = "Daily power quality statistics API")
public class StatsController {

    private final StatsService statsService;

    /**
     * Get today's statistics
     * GET /api/stats/daily
     */
    @Operation(summary = "Get today's statistics", description = "Returns power quality statistics for the current day")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved today's statistics"),
        @ApiResponse(responseCode = "404", description = "No data available for today")
    })
    @GetMapping("/daily")
    public ResponseEntity<StatsDTO> getDailyStats() {
        return ResponseEntity.of(statsService.getTodayStats());
    }

    /**
     * Get statistics for the last 7 days
     * GET /api/stats/last-7-days
     */
    @Operation(summary = "Get statistics for the last 7 days",
               description = "Returns a list of daily statistics for the last 7 days (including today)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "404", description = "No data available")
    })
    @GetMapping("/last-7-days")
    public ResponseEntity<List<StatsDTO>> getLast7DayStats() {
        List<StatsDTO> stats = statsService.getLastDaysStats(7);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get statistics for the last 30 days
     * GET /api/stats/last-30-days
     */
    @Operation(summary = "Get statistics for the last 30 days",
               description = "Returns a list of daily statistics for the last 30 days (including today)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "404", description = "No data available")
    })
    @GetMapping("/last-30-days")
    public ResponseEntity<List<StatsDTO>> getLast30DayStats() {
        List<StatsDTO> stats = statsService.getLastDaysStats(30);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get statistics for a custom date range
     * GET /api/stats/range?from=2025-11-01&to=2025-11-13
     */
    @Operation(summary = "Get statistics for a custom date range",
               description = "Returns a list of daily statistics for the specified date range (inclusive)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "400", description = "Invalid date range (from > to, future dates, or range > 365 days)"),
        @ApiResponse(responseCode = "404", description = "No data available for the specified range")
    })

    @GetMapping("/range")
    public ResponseEntity<List<StatsDTO>> getRangeStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        List<StatsDTO> stats = statsService.getStatsInDateRange(from, to);

        return ResponseEntity.ok(stats);
    }

    /**
     * Get statistics for a specific date
     * GET /api/stats/date?date=2025-11-10
     */
    @Operation(summary = "Get statistics for a specific date",
               description = "Returns power quality statistics for a single date")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
        @ApiResponse(responseCode = "404", description = "No data available for the specified date")
    })
    @GetMapping("/date")
    public ResponseEntity<StatsDTO> getStatsForDate(
            @Parameter(description = "Date in ISO format (YYYY-MM-DD)", example = "2025-11-10", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.of(statsService.getStatsForDate(date));
    }
}
