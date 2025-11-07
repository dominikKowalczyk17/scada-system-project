# CI/CD Pipeline Setup Guide

This document explains the simplified CI/CD pipeline configuration for the SCADA System project.

## Overview

The pipeline has been simplified to focus on essential quality checks:
- ✅ Backend tests using H2 in-memory database
- ✅ Frontend tests using Vitest
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Production builds

## What Changed

### Backend Testing
**Problem:** Tests failed because they required PostgreSQL and MQTT broker connections.

**Solution:**
1. Added H2 in-memory database dependency to `pom.xml`
2. Created test profile in `src/test/resources/application-test.properties`
3. Updated `ScadaSystemApplicationTests.java` to use `@ActiveProfiles("test")`

**How it works:**
- Tests now use H2 database in PostgreSQL compatibility mode
- MQTT autoconfiguration is disabled during tests
- No external dependencies required for CI/CD

### Frontend Testing
**Problem:** No test framework or test scripts were configured.

**Solution:**
1. Added Vitest testing framework (optimized for Vite)
2. Configured React Testing Library for component testing
3. Created test scripts: `test`, `test:watch`, `test:coverage`, `type-check`
4. Added example test for Button component

**How it works:**
- Vitest runs in jsdom environment for React testing
- Coverage reports generated with V8 provider
- Tests run fast with hot module replacement in watch mode

### CI Workflow Simplification
**Removed:**
- ❌ SonarCloud integration
- ❌ OWASP dependency scanning
- ❌ Security vulnerability scanning
- ❌ Multiple specialized jobs

**Kept:**
- ✅ Backend tests and build
- ✅ Frontend tests and build
- ✅ Type checking and linting
- ✅ Summary report

## Running Tests Locally

### Backend Tests
```bash
cd scada-system
./mvnw clean test
```

This will:
1. Use H2 in-memory database automatically (via `@ActiveProfiles("test")`)
2. Run all JUnit tests
3. Generate test reports in `target/surefire-reports/`

### Frontend Tests
```bash
cd webapp

# Install dependencies first (if not done)
npm install

# Run tests once
npm run test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type check only
npm run type-check
```

## CI/CD Pipeline Triggers

### CI (Continuous Integration)
**Triggers:**
- Pull requests to `master` branch
- Pushes to `master` branch
- Manual trigger via GitHub Actions UI

**Jobs:**
1. **Backend** - Tests and builds Spring Boot application
2. **Frontend** - Tests, type-checks, lints, and builds React application
3. **CI Summary** - Generates summary report

### CD (Continuous Deployment)
**Triggers:**
- Manual only (via GitHub Actions UI with workflow_dispatch)

**Jobs:**
1. **Pre-deployment Tests** - Runs full test suite
2. **Build** - Creates production artifacts (JAR + frontend build)
3. **Deploy** - Deploys to Raspberry Pi (requires secrets configuration)

## Required GitHub Secrets (for CD)

To use the deployment workflow, configure these secrets in GitHub repository settings:

```
DEPLOY_SSH_KEY - SSH private key for Raspberry Pi access
RPI_HOST       - Raspberry Pi IP address or hostname
RPI_USER       - SSH username on Raspberry Pi
```

**Note:** The warnings in CD workflow are expected - these secrets need to be configured in your GitHub repository settings before deployment will work.

## Test Coverage

### Backend
- ✅ Application context loads successfully
- ✅ H2 database configured correctly
- ✅ Spring Boot autoconfiguration works

**Next steps:** Add more tests for:
- REST API endpoints
- MQTT message handling
- Database repositories
- Service layer logic

### Frontend
- ✅ Button component renders correctly
- ✅ Component accepts different size props
- ✅ Component applies correct CSS classes

**Next steps:** Add more tests for:
- Other UI components (Card, Icon, StatusIndicator)
- Complex components (Dashboard, LiveChart, AlertPanel)
- User interactions with Testing Library's `userEvent`
- Component integration tests

## Adding More Tests

### Backend Test Example
```java
@SpringBootTest
@ActiveProfiles("test")
class MyServiceTest {

    @Autowired
    private MyService myService;

    @Test
    void shouldDoSomething() {
        // Arrange
        var input = "test";

        // Act
        var result = myService.process(input);

        // Assert
        assertThat(result).isNotNull();
    }
}
```

### Frontend Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Backend Tests Fail
1. Check if `@ActiveProfiles("test")` is present on test class
2. Verify H2 dependency is in `pom.xml`
3. Check `application-test.properties` exists
4. Run `./mvnw clean test -X` for detailed logs

### Frontend Tests Fail
1. Check if dependencies are installed: `npm install`
2. Verify `vitest.config.ts` exists
3. Check `src/test/setup.ts` is configured
4. Run `npm run test -- --reporter=verbose` for detailed output

### CI Pipeline Fails
1. Check the job logs in GitHub Actions
2. Verify all dependencies are specified in `package.json` and `pom.xml`
3. Ensure test files follow naming conventions (`.test.tsx` or `Test.java`)

## Performance

- Backend tests: ~5-10 seconds (with H2 in-memory DB)
- Frontend tests: ~2-5 seconds (with Vitest)
- Full CI pipeline: ~3-5 minutes

## Further Improvements

Consider adding later:
- Code coverage thresholds
- E2E tests with Playwright or Cypress
- Visual regression testing
- Performance benchmarks
- Docker container builds
- Automated dependency updates (Dependabot)
