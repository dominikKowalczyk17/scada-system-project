package com.dkowalczyk.scadasystem.model.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ValidationResult {
    private boolean valid;
    private List<String> warnings;
    private List<String> errors;    
}
