package com.dkowalczyk.scadasystem;

import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Base class for service layer unit tests using Mockito.
 *
 * <p>Provides fast, isolated testing without Spring context. Use {@code @Mock} for dependencies
 * and {@code @InjectMocks} for the service under test. Tests run as plain JUnit tests.
 *
 * <p>Example usage:
 * <pre>
 * class MeasurementServiceTest extends BaseServiceTest {
 *     &#64;Mock
 *     private MeasurementRepository repository;
 *
 *     &#64;InjectMocks
 *     private MeasurementService service;
 *
 *     &#64;Test
 *     void shouldSaveAndBroadcast() {
 *         when(repository.save(any())).thenReturn(new Measurement());
 *         service.saveMeasurement(new Measurement());
 *         verify(repository).save(any());
 *     }
 * }
 * </pre>
 *
 * @see BaseRepositoryTest for repository tests
 * @see BaseControllerTest for controller tests
 * @see BaseIntegrationTest for full context tests
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@ExtendWith(MockitoExtension.class)
public abstract class BaseServiceTest {}
