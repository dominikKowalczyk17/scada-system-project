package com.dkowalczyk.scadasystem.model.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Validation result containing safety threshold and PN-EN 50160 compliance status.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Data
@AllArgsConstructor
public class ValidationResult {
    private boolean valid;
    private List<String> warnings;
    private List<String> errors;
}
