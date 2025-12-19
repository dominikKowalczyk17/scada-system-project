package com.dkowalczyk.scadasystem.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.model.dto.ValidationResult;
import com.dkowalczyk.scadasystem.util.Constants;
import com.dkowalczyk.scadasystem.util.MathUtils;

@Service
public class MeasurementValidator {
    public ValidationResult validate(MeasurementRequest request) {
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        double voltageRms = request.getVoltageRms();
        double currentRms = request.getCurrentRms();
        double frequency = request.getFrequency();
        double cosPhi = request.getCosPhi();
        double thdVoltage = request.getThdVoltage();
        double calculatedApparentPower = MathUtils.calculateApparentPower(request.getPowerActive(), request.getPowerReactive());
        double apparentPowerFromUI = voltageRms * currentRms;

        if (voltageRms > 360.0) {
            errors.add("Błąd krytyczny: Napięcie " + voltageRms + "V przekracza próg bezpieczeństwa (360V).");
        } else if (voltageRms < Constants.NOMINAL_VOLTAGE * (1 - Constants.VOLTAGE_TOLERANCE) ||
                voltageRms > Constants.NOMINAL_VOLTAGE * (1 + Constants.VOLTAGE_TOLERANCE)) {
            warnings.add("Ostrzeżenie: Napięcie " + voltageRms + "V poza normą PN-EN 50160.");
        }

        if (currentRms > 40.0) {
            errors.add("Błąd krytyczny: Prąd " + currentRms + "A przekracza próg bezpieczeństwa (40A).");
        }
        
        if (frequency < 45.0 || frequency > 55.0) {
            errors.add("Błąd krytyczny: Częstotliwość " + frequency + "Hz poza bezpiecznym zakresem (45-55Hz).");
        } else if (frequency < Constants.FREQUENCY_MIN || 
                   frequency > Constants.FREQUENCY_MAX) {
            warnings.add("Ostrzeżenie: Częstotliwość " + frequency + "Hz poza normą PN-EN 50160.");
        }
        
        if (cosPhi < Constants.MIN_POWER_FACTOR) {
            warnings.add("Ostrzeżenie: Współczynnik mocy " + cosPhi + " poniżej 0.85 może wskazywać na problemy z efektywnością energetyczną.");
        }
        
        if (thdVoltage > Constants.VOLTAGE_THD_LIMIT) {
            warnings.add("Ostrzeżenie: THD napięcia " + thdVoltage + "% przekracza próg bezpieczeństwa (" + Constants.VOLTAGE_THD_LIMIT + "%).");
        }

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
