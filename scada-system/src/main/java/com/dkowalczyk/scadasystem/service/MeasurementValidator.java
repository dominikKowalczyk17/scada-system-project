package com.dkowalczyk.scadasystem.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

import com.dkowalczyk.scadasystem.config.MonitoringProperties;
import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.model.dto.ValidationResult;
import com.dkowalczyk.scadasystem.util.MathUtils;
import lombok.RequiredArgsConstructor;

/**
 * Validates measurement data against safety thresholds and PN-EN 50160 standards.
 *
 * <p>Checks voltage, current, frequency, power factor, THD, and power calculation consistency.
 * Returns warnings for standard deviations and errors for critical safety violations.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Service
@RequiredArgsConstructor
public class MeasurementValidator {

    private final MonitoringProperties monitoringProperties;
    /**
     * Validates measurement request against safety and quality standards.
     *
     * @param request measurement data from ESP32
     * @return validation result with warnings and errors (Polish messages for user display)
     */
    public ValidationResult validate(MeasurementRequest request) {
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        double voltageRms = request.getVoltageRms();
        double currentRms = request.getCurrentRms();
        double frequency = request.getFrequency();
        double powerFactor = request.getPowerFactor() != null ? request.getPowerFactor() : 1.0;
        double thdVoltage = request.getThdVoltage();

        // Budeanu power theory: S² = P² + Q₁² + D²
        double p = request.getPowerActive();
        double q1 = request.getPowerReactive();
        double d = request.getPowerDistortion() != null ? request.getPowerDistortion() : 0.0;
        double calculatedApparentPower = Math.sqrt(p*p + q1*q1 + d*d);
        double apparentPowerFromUI = voltageRms * currentRms;

        if (voltageRms > 360.0) {
            errors.add("Błąd krytyczny: Napięcie " + voltageRms + "V przekracza próg bezpieczeństwa (360V).");
        } else if (voltageRms < monitoringProperties.getVoltage().getNominal() * (1 - monitoringProperties.getVoltage().getTolerance()) ||
                voltageRms > monitoringProperties.getVoltage().getNominal() * (1 + monitoringProperties.getVoltage().getTolerance())) {
            warnings.add("Ostrzeżenie: Napięcie " + voltageRms + "V poza normą PN-EN 50160.");
        }

        if (currentRms > 40.0) {
            errors.add("Błąd krytyczny: Prąd " + currentRms + "A przekracza próg bezpieczeństwa (40A).");
        }
        
        if (frequency < 45.0 || frequency > 55.0) {
            errors.add("Błąd krytyczny: Częstotliwość " + frequency + "Hz poza bezpiecznym zakresem (45-55Hz).");
        } else if (frequency < monitoringProperties.getFrequency().getMin() || 
                   frequency > monitoringProperties.getFrequency().getMax()) {
            warnings.add("Ostrzeżenie: Częstotliwość " + frequency + "Hz poza normą PN-EN 50160.");
        }
        
        if (powerFactor < monitoringProperties.getPowerQuality().getMinPowerFactor()) {
            warnings.add("Ostrzeżenie: Współczynnik mocy " + powerFactor + " poniżej 0.85 może wskazywać na problemy z efektywnością energetyczną.");
        }
        
        double thdLimit = monitoringProperties.getPowerQuality().getThdVoltageLimit();
        if (thdVoltage > thdLimit) {
            warnings.add("Ostrzeżenie: THD napięcia " + thdVoltage + "% przekracza próg bezpieczeństwa (" + thdLimit + "%).");
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
