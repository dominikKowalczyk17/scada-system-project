package com.dkowalczyk.scadasystem.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

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

    @Column(nullable = false)
    private Float voltageRms;

    @Column(nullable = false)
    private Float currentRms;
    
    private Float powerActive;
    
    private Float powerApparent;
    
    private Float powerReactive;
    
    private Float cosPhi;

    @Column(nullable = false)
    private Float frequency;
    
    private Float thdVoltage;

    private Float thdCurrent;

    @Column(name = "harmonics_v", columnDefinition = "real[]")
    private Float[] harmonicsV;

    @Column(name = "harmonics_i", columnDefinition = "real[]")
    private Float[] harmonicsI;

    @Column(updatable = false)
    @CreationTimestamp
    private Instant createdAt;
}