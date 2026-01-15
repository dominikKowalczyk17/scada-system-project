package com.dkowalczyk.scadasystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScadaSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScadaSystemApplication.class, args);
    }

}
