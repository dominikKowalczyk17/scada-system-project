package com.dkowalczyk.scadasystem.exception;

/**
 * Exception thrown when measurement validation fails (safety thresholds, data inconsistency).
 * Results in HTTP 400 Bad Request.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
