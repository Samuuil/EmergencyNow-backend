# Refresh Token Migration to Redis

## Summary

Refresh tokens are now stored in Redis instead of the database, with a 30-day expiration period. This follows the implementation pattern from the example project.

## Backend Changes Made

### 1. **RedisService** (`src/common/redis/redis.service.ts`)
   - Added `addRefreshToken(userId, refreshToken)` - Stores refresh token in Redis with 30-day expiration
   - Added `getRefreshToken(userId)` - Retrieves refresh token from Redis
   - Added `removeRefreshToken(userId)` - Removes refresh token from Redis on logout

### 2. **RefreshTokenStrategy** (`src/auth/strategies/refresh-token.strategy.ts`)
   - New Passport strategy for validating refresh tokens
   - Checks if token exists in Redis before validating
   - Returns user object if token is valid

### 3. **RefreshTokenGuard** (`src/auth/guards/refresh-token.guard.ts`)
   - New guard for protecting refresh token endpoints

### 4. **AuthService** (`src/auth/auth.service.ts`)
   - Updated to use Redis for storing/retrieving refresh tokens
   - Refresh token expiration changed from 7 days to 30 days
   - `refreshToken()` now validates against Redis instead of database
   - `logout()` now removes token from Redis
   - Removed bcrypt hashing (tokens stored as-is in Redis)

### 5. **AuthModule** (`src/auth/auth.module.ts`)
   - Added `RefreshTokenStrategy` to providers

### 6. **User Entity** (`src/users/entities/user.entity.ts`)
   - **REMOVED** `refreshToken` column
   - **ACTION REQUIRED**: Generate migration to drop the `refreshToken` column:
     ```bash
     npm run migration:generate src/migrations/RemoveRefreshTokenColumn
     npm run migration:run
     ```

### 7. **UsersService** (`src/users/user.service.ts`)
   - **REMOVED** `updateRefreshToken()` method (no longer needed)

### 8. **Tests Updated**
   - `auth.service.spec.ts` - Updated to mock RedisService instead of database operations
   - `user.service.spec.ts` - Removed `updateRefreshToken()` tests

## Frontend Changes Required

### **NO CHANGES NEEDED** ✅

The frontend does **NOT** need to make any changes! Here's why:

1. **API Contract Unchanged**: The endpoints remain exactly the same:
   - `POST /auth/verify-code` - Still returns `{ accessToken, refreshToken }`
   - `POST /auth/refresh` - Still accepts `{ refreshToken }` and returns new tokens
   - `POST /auth/logout` - Still works the same way

2. **Token Format Unchanged**: The JWT refresh token structure and format remain identical

3. **Token Storage**: Frontend continues to store refresh tokens the same way (localStorage, sessionStorage, httpOnly cookies, etc.)

4. **Token Expiration**: Changed from 7 days to 30 days (frontend benefits from longer sessions)

## Migration Steps

1. **Ensure Redis is running** with the correct URL in your environment variables:
   ```
   REDIS_URL=redis://localhost:6379
   ```

2. **Generate and run database migration** to remove the `refreshToken` column:
   ```bash
   npm run migration:generate src/migrations/RemoveRefreshTokenColumn
   npm run migration:run
   ```

3. **Restart the backend** - All existing refresh tokens in the database will be invalidated
   - Users will need to log in again to get new Redis-stored refresh tokens
   - This is expected behavior during the migration

## Benefits

- **Performance**: Redis is faster than database for token lookups
- **Auto-Expiration**: Redis automatically removes expired tokens (30 days)
- **Scalability**: Better for horizontal scaling with multiple backend instances
- **Session Management**: Easy to invalidate all user sessions by clearing Redis keys

## Configuration

The refresh token expiration is hardcoded to 30 days (2,592,000 seconds). To make this configurable, add to your `.env`:
```
REFRESH_TOKEN_EXPIRATION=2592000  # 30 days in seconds
```

Then update `RedisService.addRefreshToken()` to use:
```typescript
const expirationSeconds = this.configService.get<number>('REFRESH_TOKEN_EXPIRATION') || 2592000;
await this.client.set(key, refreshToken, 'EX', expirationSeconds);
```

## Notes

- Redis prefix for refresh tokens: `refresh-token:{userId}`
- Tokens are stored as-is (not hashed) since Redis is assumed to be secure
- On logout, tokens are immediately removed from Redis
- If Redis goes down, users will need to log in again (refresh tokens won't work)
