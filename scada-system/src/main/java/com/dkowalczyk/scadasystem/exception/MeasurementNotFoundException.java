package com.dkowalczyk.scadasystem.exception;

/**
 * Exception thrown when requested measurement cannot be found.
 * Results in HTTP 404 Not Found.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
public class MeasurementNotFoundException extends RuntimeException {
    public MeasurementNotFoundException(String message) {
        super(message);
    }
}
