package com.dkowalczyk.scadasystem;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

/**
 * Abstract base class for JPA repository integration tests.
 * * <p>Provides common test configuration:
 * <ul>
 * <li>"test" profile with H2 database in PostgreSQL compatibility mode</li>
 * <li>Automatic JPA configuration (@DataJpaTest)</li>
 * <li>Injected TestEntityManager for persist/flush/clear operations</li>
 * <li>Disabled MQTT auto-configuration (via @DataJpaTest)</li>
 * </ul>
 * * <p>Usage:
 * <pre>
 * class MyRepositoryTest extends BaseRepositoryTest {
 * @Autowired
 * private MyRepository repository;
 * * @Test
 * void testSomething() {
 * // use entityManager and repository
 * }
 * }
 * </pre>
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
