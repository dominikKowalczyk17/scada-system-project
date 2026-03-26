package com.dkowalczyk.scadasystem.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalized configuration for electrical monitoring thresholds.
 *
 * <p>Defaults follow EU standards (PN-EN 50160 / IEC 61000). Override any value in
 * {@code application.properties}, via environment variables, or with a Spring profile
 * for non-EU deployments.
 *
 * <p>Quick grid standard switch examples:
 * <pre>
 * # JVM argument
 * --monitoring.frequency.nominal=60.0 --monitoring.voltage.nominal=120.0
 *
 * # Environment variable
 * MONITORING_FREQUENCY_NOMINAL=60.0
 *
 * # Spring profile (application-us.properties)
 * monitoring.voltage.nominal=120.0
 * monitoring.frequency.nominal=60.0
 * </pre>
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Component
@ConfigurationProperties(prefix = "monitoring")
@Data
public class MonitoringProperties {

    private Voltage voltage = new Voltage();
    private Frequency frequency = new Frequency();
    private PowerQuality powerQuality = new PowerQuality();

    /**
     * Voltage monitoring thresholds (PN-EN 50160 Group 1 + IEC 61000-2-2).
     */
    @Data
    public static class Voltage {

        /** Nominal supply voltage in volts (EU: 230V, US: 120V). */
        private double nominal = 230.0;

        /** Acceptable voltage tolerance as a fraction (PN-EN 50160: ±10% = 0.10). */
        private double tolerance = 0.10;

        /** Voltage sag threshold as a fraction of nominal (PN-EN 50160: 90% = 0.90). */
        private double sagThresholdRatio = 0.90;

        /** Voltage swell threshold as a fraction of nominal (PN-EN 50160: 110% = 1.10). */
        private double swellThresholdRatio = 1.10;

        /** Voltage interruption threshold as a fraction of nominal (PN-EN 50160: 10% = 0.10). */
        private double interruptionThresholdRatio = 0.10;

        /** Absolute voltage below which a sag is detected (nominal * sagThresholdRatio). */
        public double getSagThreshold() {
            return nominal * sagThresholdRatio;
        }

        /** Absolute voltage above which a swell is detected (nominal * swellThresholdRatio). */
        public double getSwellThreshold() {
            return nominal * swellThresholdRatio;
        }

        /** Absolute voltage below which an interruption is detected (nominal * interruptionThresholdRatio). */
        public double getInterruptionThreshold() {
            return nominal * interruptionThresholdRatio;
        }

        /** Upper voltage deviation limit in percent (+tolerance*100). */
        public double getDeviationUpperLimit() {
            return tolerance * 100.0;
        }

        /** Lower voltage deviation limit in percent (-tolerance*100). */
        public double getDeviationLowerLimit() {
            return -tolerance * 100.0;
        }
    }

    /**
     * Frequency monitoring thresholds (PN-EN 50160 Group 2 / IEC 61000-4-30).
     */
    @Data
    public static class Frequency {

        /** Nominal grid frequency in Hz (EU: 50.0, US: 60.0). */
        private double nominal = 50.0;

        /** Acceptable frequency deviation in Hz (PN-EN 50160: ±0.5 Hz). */
        private double deviationLimitHz = 0.5;

        /** Minimum acceptable frequency (nominal - deviationLimitHz). */
        public double getMin() {
            return nominal - deviationLimitHz;
        }

        /** Maximum acceptable frequency (nominal + deviationLimitHz). */
        public double getMax() {
            return nominal + deviationLimitHz;
        }
    }

    /**
     * Power quality thresholds (PN-EN 50160 Group 4 + IEC 61000-3-2).
     */
    @Data
    public static class PowerQuality {

        /** THD voltage limit in percent (PN-EN 50160: 8%, IEEE 519: 5%). */
        private double thdVoltageLimit = 8.0;

        /** Minimum acceptable power factor for load diagnostics. */
        private double minPowerFactor = 0.85;
    }
}
