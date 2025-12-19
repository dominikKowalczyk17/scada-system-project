package com.dkowalczyk.scadasystem.service;

import java.util.List;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.model.dto.ValidationResult;
import com.dkowalczyk.scadasystem.util.Constants;
import com.dkowalczyk.scadasystem.util.MathUtils;

@Service
public class MeasurementValidator {
    public ValidationResult validate(MeasurementRequest request) {
        List<String> warnings = new java.util.ArrayList<>();
        List<String> errors = new java.util.ArrayList<>();

        double voltageRms = request.getVoltageRms();
        double currentRms = request.getCurrentRms();
        double frequency = request.getFrequency();
        double cosPhi = request.getCosPhi();
        double thdVoltage = request.getThdVoltage();
        double calculatedApparentPower = MathUtils.calculateApparentPower(request.getPowerActive(), request.getPowerReactive());
        double apparentPowerFromUI = voltageRms * currentRms;

        Stream.of(voltageRms)
            .filter(val -> val > 360.0)
            .forEach(val -> errors.add("Błąd krytyczny: Napięcie " + val + "V przekracza próg bezpieczeństwa (360V)."));

        Stream.of(voltageRms)
            .filter(val -> (val < Constants.NOMINAL_VOLTAGE * (1 - Constants.VOLTAGE_TOLERANCE) || 
                            val > Constants.NOMINAL_VOLTAGE * (1 + Constants.VOLTAGE_TOLERANCE)) 
                            && val <= 360.0)
            .forEach(val -> warnings.add("Ostrzeżenie: Napięcie " + val + "V poza normą PN-EN 50160."));

        Stream.of(currentRms)
            .filter(val -> val > 40.0)
            .forEach(val -> errors.add("Błąd krytyczny: Prąd " + val + "A przekracza próg bezpieczeństwa (40A)."));

        Stream.of(frequency)
            .filter(val -> val < 45.0 || val > 55.0)
            .forEach(val -> errors.add("Błąd krytyczny: Częstotliwość " + val + "Hz poza bezpiecznym zakresem (45-55Hz)."));

        Stream.of(frequency)
            .filter(val -> (val < Constants.NOMINAL_FREQUENCY - Constants.FREQUENCY_DEVIATION_UPPER_LIMIT_HZ || 
                            val > Constants.NOMINAL_FREQUENCY + Constants.FREQUENCY_DEVIATION_UPPER_LIMIT_HZ))
            .forEach(val -> warnings.add("Ostrzeżenie: Częstotliwość " + val + "Hz poza normą PN-EN 50160."));

        Stream.of(cosPhi)
            .filter(val -> val < 0.85)
            .forEach(val -> errors.add("Błąd krytyczny: Współczynnik mocy " + val + " poza bezpiecznym zakresem (0.85)."));
        
        Stream.of(thdVoltage)
            .filter(val -> val > Constants.VOLTAGE_THD_LIMIT)
            .forEach(val -> warnings.add("Ostrzeżenie: THD napięcia " + val + "% przekracza próg bezpieczeństwa (" + Constants.VOLTAGE_THD_LIMIT + "%)."));

        // Sanity check for apparent power
        if (request.getPowerApparent() != null) {
            double reportedApparentPower = request.getPowerApparent();
            double diff = Math.abs(reportedApparentPower - calculatedApparentPower);
            double diffUI = Math.abs(reportedApparentPower - apparentPowerFromUI);
            double tolerance = 0.05 * reportedApparentPower; // 5%
            
            if (diff > tolerance) errors.add(String.format("Błąd krytyczny: Niespójność mocy (P,Q vs S). Różnica: %.2f VA.", diff));

            if (diffUI > tolerance) warnings.add(String.format("Ostrzeżenie: Niespójność pomiarów (U,I vs S). Różnica: %.2f VA.", diffUI));
        }

        boolean valid = errors.isEmpty();
        return new ValidationResult(valid, warnings, errors);
    }
}
