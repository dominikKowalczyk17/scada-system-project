package com.dkowalczyk.scadasystem.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.model.dto.ValidationResult;

@DisplayName("MeasurementValidator Test")
public class MeasurementValidatorTest {
    private final MeasurementValidator validator = new MeasurementValidator();

    @Test
    void shouldReturnErrorWhenVoltageIsTooHigh() {
        // GIVEN
        MeasurementRequest request = new MeasurementRequest();
        request.setVoltageRms(400.0);
        request.setFrequency(50.0);
        request.setPowerFactor(1.0);
        request.setCurrentRms(10.0);
        request.setPowerActive(2300.0);
        request.setPowerReactive(0.0);
        request.setPowerApparent(2300.0);
        request.setThdVoltage(0.0);
        request.setThdCurrent(0.0);

        // WHEN
        ValidationResult result = validator.validate(request);

        // THEN
        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("360V")));
    }

    @Test
    void shouldReturnWarningWhenThdIsAboveLimit() {
        // GIVEN
        MeasurementRequest request = new MeasurementRequest();
        request.setVoltageRms(230.0);
        request.setFrequency(50.0);
        request.setPowerFactor(1.0);
        request.setCurrentRms(5.0);
        request.setPowerActive(1150.0);
        request.setPowerReactive(0.0);
        request.setPowerApparent(1150.0);
        request.setThdVoltage(8.5);

        // WHEN
        ValidationResult result = validator.validate(request);

        // THEN
        assertTrue(result.isValid(), "Pomiar powinien być ważny (brak errors)");
        assertFalse(result.getWarnings().isEmpty(), "Powinno pojawić się ostrzeżenie o THD");
        assertTrue(result.getWarnings().get(0).contains("THD napięcia"));
    }

    @Test
    void shouldReturnErrorWhenPowerTriangleIsInconsistent() {
        // GIVEN
        MeasurementRequest request = new MeasurementRequest();
        request.setVoltageRms(230.0);
        request.setCurrentRms(10.0);
        request.setPowerActive(100.0);
        request.setPowerReactive(0.0);
        request.setPowerApparent(500.0);
        request.setFrequency(50.0);
        request.setPowerFactor(1.0);
        request.setThdVoltage(0.0);

        // WHEN
        ValidationResult result = validator.validate(request);

        // THEN
        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream()
            .anyMatch(e -> e.contains("Niespójność mocy (P,Q vs S)")));
    }

    @Test
    void shouldReturnWarningWhenUIProductDoesNotMatchApparentPower() {
        // GIVEN
        MeasurementRequest request = new MeasurementRequest();
        request.setVoltageRms(230.0);
        request.setCurrentRms(1.0);
        request.setPowerActive(500.0); 
        request.setPowerReactive(0.0);
        request.setPowerApparent(500.0);
        request.setFrequency(50.0);
        request.setPowerFactor(1.0);
        request.setThdVoltage(0.0);

        // WHEN
        ValidationResult result = validator.validate(request);

        // THEN
        // Pamiętasz, że dla UI ustawiliśmy tylko ostrzeżenie (Warning)?
        assertTrue(result.isValid()); 
        assertFalse(result.getWarnings().isEmpty());
        assertTrue(result.getWarnings().stream()
            .anyMatch(w -> w.contains("Niespójność pomiarów (U,I vs S)")));
    }
}
