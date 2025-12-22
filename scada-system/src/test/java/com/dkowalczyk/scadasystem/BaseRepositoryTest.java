package com.dkowalczyk.scadasystem;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class for JPA repository tests using H2 in-memory database.
 *
 * <p>Configures only JPA slice ({@code @DataJpaTest}) with PostgreSQL compatibility mode.
 * Provides {@link TestEntityManager} for direct entity operations and {@link #flushAndClear()}
 * utility to synchronize persistence context with database.
 *
 * <p>Example usage:
 * <pre>
 * class MeasurementRepositoryTest extends BaseRepositoryTest {
 *     &#64;Autowired
 *     private MeasurementRepository repository;
 *
 *     &#64;Test
 *     void shouldFindByDateRange() {
 *         Measurement m = new Measurement();
 *         entityManager.persist(m);
 *         flushAndClear(); // Write to DB and clear cache
 *
 *         List&lt;Measurement&gt; result = repository.findByTimestampBetween(...);
 *         assertThat(result).hasSize(1);
 *     }
 * }
 * </pre>
 *
 * @see BaseServiceTest for service layer tests
 * @see BaseControllerTest for controller tests
 * @see BaseIntegrationTest for full context tests
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@DataJpaTest
@ActiveProfiles("test")
public abstract class BaseRepositoryTest {

    @Autowired
    protected TestEntityManager entityManager;

    protected void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
