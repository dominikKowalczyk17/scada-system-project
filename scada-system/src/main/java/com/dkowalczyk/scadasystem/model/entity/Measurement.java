package com.dkowalczyk.scadasystem.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "measurements", indexes = {
 @Index(name = "idx_measurement_time", columnList = "time")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Measurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant time;

    private Float voltageRms;
    private Float currentRms;
    private Float powerActive;
    private Float powerApparent;
    private Float powerReactive;
    private Float cosPhi;
    private Float frequency;
    private Float thdVoltage;
    private Float thdCurrent;
    private Float pstFlicker;
    private Float capacitorUf;

    @Column(columnDefinition = "real[]")
    private Float[] harmonicsV;

    @Column(columnDefinition = "real[]")
    private Float[] harmonicsI;

    @Column(updatable = false)
    private Instant createdAt = Instant.now();
}