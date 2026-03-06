# Testing Guide

This document provides instructions for running unit tests in the EmergencyNow backend application.

## Overview

The project uses **Jest** as the testing framework with the following setup:
- Pure unit tests with mocked dependencies (database, Redis, WebSockets, Google Maps)
- Target coverage: **90%** for all metrics (lines, statements, branches, functions)
- TypeScript support via `ts-jest`

## Test Structure

Tests are organized alongside their source files:
```
src/
├── profiles/
│   ├── profile.service.ts
│   ├── profile.service.spec.ts
│   ├── profile.controller.ts
│   └── profile.controller.spec.ts
├── contacts/
│   ├── contact.service.ts
│   ├── contact.service.spec.ts
│   ├── contact.controller.ts
│   └── contact.controller.spec.ts
```

## Running Tests

### Run All Tests
```powershell
npm test
```

### Run Tests in Watch Mode
Automatically re-runs tests when files change:
```powershell
npm run test:watch
```

### Run Tests with Coverage
```powershell
npm run test:cov
```

### Run Specific Test File
```powershell
npm test -- profile.service.spec.ts
```

### Run Tests for a Specific Module
```powershell
npm test -- --testPathPattern=profiles
npm test -- --testPathPattern=contacts
```

### Debug Tests
```powershell
npm run test:debug
```

Then attach your debugger to the Node process (default port: 9229).

## Viewing Coverage Reports

After running `npm run test:cov`, coverage reports are generated in the `coverage/` directory:

### HTML Report (Recommended)
1. Navigate to `coverage/lcov-report/index.html`
2. Open in your browser for an interactive coverage report

### Terminal Output
Coverage summary is displayed directly in the terminal after running tests with coverage.

### Coverage Metrics
The project enforces 90% coverage thresholds for:
- **Statements**: 90%
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%

## What's Being Tested

### Profiles Module

**ProfilesService (`profile.service.spec.ts`)**:
- ✅ Profile creation with database mocking
- ✅ Pagination (findAll)
- ✅ Finding single profiles
- ✅ Updating profiles
- ✅ Deleting profiles
- ✅ User-specific profile operations (createOrUpdateForUser, getProfileForUser)
- ✅ Getting profiles by EGN
- ✅ Error handling (NotFoundException, InternalServerErrorException)

**ProfilesController (`profile.controller.spec.ts`)**:
- ✅ All CRUD endpoints
- ✅ User-specific endpoints (/me routes)
- ✅ Admin-specific endpoints
- ✅ EGN-based profile retrieval

### Contacts Module

**ContactsService (`contact.service.spec.ts`)**:
- ✅ Contact creation with database mocking
- ✅ Pagination (findAll)
- ✅ Finding single contacts
- ✅ Updating contacts
- ✅ Deleting contacts
- ✅ User-specific contact operations
- ✅ Maximum contacts validation (5 contacts limit)
- ✅ Authorization checks (users can only access their own contacts)
- ✅ Error handling (NotFoundException, BadRequestException, InternalServerErrorException)

**ContactsController (`contact.controller.spec.ts`)**:
- ✅ All CRUD endpoints
- ✅ User-specific endpoints (/me routes)
- ✅ Admin-specific endpoints
- ✅ Proper service method delegation

### Hospitals Module

**HospitalsService (`hospitals.service.spec.ts`)**:
- ✅ Hospital creation with database mocking
- ✅ Pagination (findAll)
- ✅ Finding all active hospitals list
- ✅ Finding single hospitals
- ✅ Updating hospitals
- ✅ Deleting hospitals
- ✅ Finding nearest hospitals with Google Maps distance calculation
- ✅ Google Maps API failure fallback (returns Infinity)
- ✅ Syncing hospitals from Google Places API
- ✅ Skip existing hospitals during sync
- ✅ Error handling with mocked Google Maps service

**HospitalsController (`hospitals.controller.spec.ts`)**:
- ✅ All CRUD endpoints
- ✅ Nearest hospitals endpoint with coordinate parsing
- ✅ Google Places sync endpoint
- ✅ Custom limit parameter handling

### State Archive Module

**StateArchiveService (`state-archive.service.spec.ts`)**:
- ✅ State archive creation with EGN uniqueness validation
- ✅ Pagination (findAll)
- ✅ Finding single state archive entries
- ✅ Updating entries with EGN conflict detection
- ✅ Deleting entries
- ✅ Finding by EGN from database
- ✅ Fetching from external API when not in database (mocked HTTP client)
- ✅ Saving external API data to local database
- ✅ Handling 404 responses from external API
- ✅ Error handling (NotFoundException, ConflictException, InternalServerErrorException)

**StateArchiveController (`state-archive.controller.spec.ts`)**:
- ✅ Paginated list endpoint
- ✅ Find by ID endpoint

### Ambulances Module

**AmbulancesService (`ambulance.service.spec.ts`)**:
- ✅ Ambulance creation with database mocking
- ✅ Ambulance creation with driver assignment
- ✅ License plate uniqueness validation
- ✅ Pagination (findAll)
- ✅ Finding single ambulances
- ✅ Updating ambulances with conflict detection
- ✅ Deleting ambulances
- ✅ Finding available ambulances (paginated and list)
- ✅ Finding nearest available ambulance with Google Maps integration
- ✅ Finding nearest ambulance excluding specific IDs
- ✅ Marking ambulances as dispatched/available
- ✅ Updating ambulance location
- ✅ Driver assignment and removal
- ✅ Driver already assigned validation
- ✅ Finding ambulance by driver ID
- ✅ Bulk location updates
- ✅ Removing inactive drivers based on threshold
- ✅ Error handling (NotFoundException, ConflictException, BadRequestException, InternalServerErrorException)

**AmbulancesController (`ambulance.controller.spec.ts`)**:
- ✅ All CRUD endpoints
- ✅ Available ambulances endpoint (paginated)
- ✅ Find by driver ID endpoint
- ✅ Location update endpoint
- ✅ Driver assignment/removal endpoints
- ✅ Mark as available/dispatched endpoints

### Mail Service Module

**MailService (`mail.service.spec.ts`)**:
- ✅ Sending emergency alert emails with location and description
- ✅ Sending hospital update emails with estimated arrival time
- ✅ Sending verification code emails
- ✅ Email template rendering with HTML
- ✅ Handling SMTP connection failures gracefully
- ✅ Nodemailer transporter initialization with config
- ✅ Error handling and logging

### SMS Service Module

**SmsService (`sms.service.spec.ts`)**:
- ✅ Sending verification code SMS via Twilio
- ✅ Sending emergency alert SMS with location
- ✅ SMS content formatting with user details
- ✅ Handling Twilio API errors gracefully
- ✅ Graceful degradation when Twilio not configured
- ✅ SMS service initialization with credentials
- ✅ Error handling and logging

### Redis Service Module

**RedisService (`redis.service.spec.ts`)**:
- ✅ Setting key with expiration (setex)
- ✅ Getting value by key
- ✅ Getting and deleting value (getdel)
- ✅ Deleting keys
- ✅ Checking key existence
- ✅ Getting TTL (time to live)
- ✅ Redis client initialization with URL
- ✅ Connection event handlers
- ✅ Retry strategy configuration
- ✅ Graceful connection cleanup on module destroy

### Google Maps Service Module

**GoogleMapsService (`google-maps.service.spec.ts`)**:
- ✅ Getting route with polyline and steps
- ✅ Getting distance and duration between two points
- ✅ Getting distances to multiple destinations
- ✅ Finding hospitals by text search with filtering
- ✅ Handling API request failures
- ✅ Parsing Google Maps API responses
- ✅ Filtering out non-hospital places (dentists, doctors)
- ✅ Default radius for hospital searches
- ✅ Error handling for various API statuses

### Users Module

**UsersService (`user.service.spec.ts`)**:
- ✅ User creation with database mocking
- ✅ Pagination (findAll)
- ✅ Finding single users with relations
- ✅ Updating users
- ✅ Deleting users
- ✅ Finding user by state archive ID
- ✅ Updating refresh tokens
- ✅ Creating user with existing state archive
- ✅ Finding user role
- ✅ Finding user EGN from state archive
- ✅ Error handling (NotFoundException, InternalServerErrorException)

**UsersController (`user.controller.spec.ts`)**:
- ✅ All CRUD endpoints
- ✅ Get user role endpoint
- ✅ Get current user EGN endpoint (/me/egn)
- ✅ Get user EGN by ID endpoint
- ✅ Admin-only access controls

### Auth Guards Module

**RolesGuard (`roles.guard.spec.ts`)**:
- ✅ Allowing access when no roles are required
- ✅ Allowing access when user has required role
- ✅ Allowing access when user has one of multiple required roles
- ✅ Denying access when user does not have required role
- ✅ Reflector integration for metadata retrieval

**WsJwtGuard (`ws-jwt.guard.spec.ts`)**:
- ✅ Authentication with token from Authorization header
- ✅ Authentication with token from auth object
- ✅ Authentication with token from query parameter
- ✅ Token extraction from multiple sources (header, auth, query)
- ✅ Throwing UnauthorizedException when no token provided
- ✅ Throwing UnauthorizedException when token is invalid
- ✅ Using default secret when JWT_SECRET is not configured
- ✅ Setting user data on WebSocket client

**JwtStrategy (`jwt.strategy.spec.ts`)**:
- ✅ Validating and returning user data from JWT payload
- ✅ Handling all role types (USER, ADMIN, DRIVER, DOCTOR)
- ✅ Working without iat and exp fields
- ✅ Using JWT_SECRET from config
- ✅ Fallback to default secret

### Verification Code Service Module

**VerificationCodeService (`verification-code.service.spec.ts`)**:
- ✅ Generating 6-digit verification codes
- ✅ Saving email verification codes to Redis
- ✅ Saving SMS verification codes to Redis
- ✅ Normalizing EGN and code (trimming whitespace)
- ✅ Verifying and consuming email codes
- ✅ Verifying and consuming SMS codes
- ✅ Throwing UnauthorizedException for invalid codes
- ✅ Handling invalid JSON gracefully
- ✅ Checking for active codes
- ✅ Getting remaining TTL
- ✅ Deleting verification codes

### Driver Inactivity Service Module

**DriverInactivityService (`driver-inactivity.service.spec.ts`)**:
- ✅ Checking for and removing inactive drivers
- ✅ Handling case when no inactive drivers found
- ✅ Handling errors gracefully
- ✅ Logging when drivers are removed
- ✅ Logging when no drivers are removed
- ✅ Error logging

### Realtime Module (WebSockets)

**DriverGateway (`driver.gateway.spec.ts`)**:
- ✅ WebSocket connection handling with JWT authentication
- ✅ Disconnecting clients without valid tokens
- ✅ Driver connection and disconnection tracking
- ✅ Handling driver responses (accept/reject calls)
- ✅ Location update handling with route recalculation
- ✅ Call offer emissions to drivers
- ✅ Call offer management (add rejection, clear offer, pending ambulance)
- ✅ Sending route updates to drivers
- ✅ Refreshing available ambulance locations
- ✅ Location request/response coordination
- ✅ Bulk location updates
- ✅ Driver online status checking
- ✅ WebSocket event emissions to specific drivers

**UserGateway (`user.gateway.spec.ts`)**:
- ✅ WebSocket connection handling with JWT authentication
- ✅ Token extraction from multiple sources (header, auth, query)
- ✅ User connection and disconnection tracking
- ✅ Notifying call dispatched events
- ✅ Notifying ambulance location updates
- ✅ Notifying call status changes
- ✅ User online status checking
- ✅ WebSocket event emissions to specific users
- ✅ Handling multiple connected users
- ✅ Graceful handling of offline users

### Auth Module

**AuthService (`auth.service.spec.ts`)**:
- ✅ Initiating login via email (sending verification code)
- ✅ Initiating login via SMS (sending verification code)
- ✅ Verifying code and returning JWT tokens
- ✅ Creating new user on first login
- ✅ Refreshing access tokens with refresh token
- ✅ Logout (clearing refresh token)
- ✅ Token generation with bcrypt hashing
- ✅ SABOTAGE mode token generation
- ✅ Error handling (NotFoundException, UnauthorizedException)
- ✅ JWT verification and validation

**AuthController (`auth.controller.spec.ts`)**:
- ✅ Initiate login endpoint (email/SMS)
- ✅ Verify code endpoint
- ✅ Refresh token endpoint
- ✅ Logout endpoint

**CurrentUser Decorator (`current-user.decorator.spec.ts`)**:
- ✅ Extracting user from request context
- ✅ Handling undefined user
- ✅ Working with different user roles

### Calls Module

**CallsController (`call.controller.spec.ts`)**:
- ✅ Create call endpoint
- ✅ Find all calls endpoint (paginated)
- ✅ Find my calls endpoint
- ✅ Find calls by user ID endpoint
- ✅ Find call by ID endpoint
- ✅ Get tracking data endpoint
- ✅ Get hospitals for call endpoint
- ✅ Select hospital endpoint
- ✅ Get hospital route endpoint
- ✅ Dispatch ambulance endpoint
- ✅ Update ambulance location endpoint
- ✅ Update call status endpoint
- ✅ Update call endpoint
- ✅ Delete call endpoint

## Mocking Strategy

### Database (TypeORM)
All database operations are mocked using Jest mock repositories:
```typescript
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
};
```

### Pagination (nestjs-paginate)
The `paginate` function is mocked:
```typescript
jest.mock('nestjs-paginate');
```

### Google Maps Service
The Google Maps service is mocked for distance calculations and hospital searches:
```typescript
const mockGoogleMapsService = {
  getDistancesToMultipleDestinations: jest.fn(),
  findHospitalsByTextSearch: jest.fn(),
  getRoute: jest.fn(),
  getDistanceAndDuration: jest.fn(),
};
```

### HTTP Client (@nestjs/axios)
The HTTP service is mocked for external API calls:
```typescript
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Usage in tests
const axiosResponse: AxiosResponse = {
  data: externalData,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
};
httpService.get.mockReturnValue(of(axiosResponse));
```

### ConfigService
Configuration values are mocked:
```typescript
const mockConfigService = {
  get: jest.fn(),
};

// Usage
configService.get.mockReturnValue('http://external-api.com');
```

### Nodemailer (Email)
The nodemailer transporter is mocked:
```typescript
jest.mock('nodemailer');

const mockTransporter = {
  sendMail: jest.fn(),
};

(nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

// Usage in tests
mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });
```

### Twilio (SMS)
The Twilio client is mocked:
```typescript
jest.mock('twilio');

const mockTwilioClient = {
  messages: {
    create: jest.fn(),
  },
};

(twilio as unknown as jest.Mock).mockReturnValue(mockTwilioClient);

// Usage in tests
mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM123' });
```

### Redis (ioredis)
The Redis client is mocked:
```typescript
jest.mock('ioredis');

const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  getdel: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

(Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

// Usage in tests
mockRedisClient.get.mockResolvedValue('cached-value');
```

### Fetch API (Google Maps)
The global fetch is mocked for API calls:
```typescript
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Usage in tests
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'response' }),
} as Response);
```

### WebSockets (Socket.IO) - Future Implementation
```typescript
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
};
```

## Coverage Exclusions

The following files are excluded from coverage requirements (configured in `package.json`):
- Test files (`*.spec.ts`, `*.e2e-spec.ts`)
- Module files (`*.module.ts`)
- Entity files (`*.entity.ts`)
- DTO files (`*.dto.ts`)
- Enum files (`*.enum.ts`)
- Migration files (`migrations/`)
- Seeding files (`seeding/`)
- Entry point (`main.ts`)
- Database configuration (`data-source.ts`)

This ensures coverage metrics focus on business logic (services and controllers).

## Best Practices

1. **Keep tests isolated**: Each test should be independent and not rely on other tests
2. **Mock all external dependencies**: Database, APIs, file systems, etc.
3. **Test error scenarios**: Include tests for exceptions and edge cases
4. **Use descriptive test names**: Clearly describe what is being tested
5. **Follow AAA pattern**: Arrange, Act, Assert
6. **Clean up after tests**: Use `beforeEach` and `afterEach` to reset mocks

## CI/CD Integration

To integrate with CI/CD pipelines:
```yaml
# Example GitHub Actions
- name: Run tests
  run: npm run test:cov
  
- name: Check coverage thresholds
  run: npm run test:cov -- --ci --coverage
```

## Troubleshooting

### Tests fail with module resolution errors
Ensure `tsconfig.json` paths are correctly configured and `moduleNameMapper` in Jest config matches.

### Coverage below 90%
1. Run `npm run test:cov` to see coverage report
2. Open `coverage/lcov-report/index.html` in browser
3. Identify uncovered lines (highlighted in red)
4. Add tests for uncovered code paths

### Tests timeout
Increase Jest timeout in test files:
```typescript
jest.setTimeout(10000); // 10 seconds
```

## Next Steps

To achieve 90% coverage across the entire application:
1. ✅ **Completed**: Profiles, Contacts, Hospitals, State Archive, Ambulances modules
2. ✅ **Completed**: Mail, SMS, Redis, and Google Maps services
3. ✅ **Completed**: Users module (service and controller)
4. ✅ **Completed**: Auth module (service, controller, guards, strategies, verification)
5. ✅ **Completed**: Driver Inactivity Service
6. ✅ **Completed**: Realtime WebSocket Gateways (DriverGateway, UserGateway)
7. **Remaining**: Calls service and controller
8. Run `npm run test:cov` regularly to monitor coverage
9. Refactor code to improve testability if needed

## Questions?

For issues or questions about testing, please refer to:
- Jest documentation: https://jestjs.io/
- NestJS testing guide: https://docs.nestjs.com/fundamentals/testing
