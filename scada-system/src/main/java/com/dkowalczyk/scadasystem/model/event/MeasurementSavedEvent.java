package com.dkowalczyk.scadasystem.model.event;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event published after a measurement is successfully saved to the database.
 * <p>
 * WHY: This event allows decoupling of WebSocket broadcasts from the transactional
 * save operation. By using @TransactionalEventListener(AFTER_COMMIT), we ensure:
 * 1. WebSocket broadcasts only happen if the transaction commits successfully
 * 2. Expensive operations (waveform reconstruction) don't prolong the transaction
 * 3. Better separation of concerns (persistence vs. notification)
 */
@Getter
public class MeasurementSavedEvent extends ApplicationEvent {

    private final Measurement measurement;
    private final MeasurementDTO dto;

    public MeasurementSavedEvent(Object source, Measurement measurement, MeasurementDTO dto) {
        super(source);
        this.measurement = measurement;
        this.dto = dto;
    }
}