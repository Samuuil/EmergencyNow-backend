export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  USER_UPDATE_FAILED = 'USER_UPDATE_FAILED',
  USER_DELETE_FAILED = 'USER_DELETE_FAILED',
  INVALID_USER_ID = 'INVALID_USER_ID',
  REFRESH_TOKEN_UPDATE_FAILED = 'REFRESH_TOKEN_UPDATE_FAILED',
  STATE_ARCHIVE_NOT_FOUND = 'STATE_ARCHIVE_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const UserErrorMessages: Record<UserErrorCode, string> = {
  [UserErrorCode.USER_NOT_FOUND]: 'User not found',
  [UserErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [UserErrorCode.USER_CREATION_FAILED]: 'Failed to create user',
  [UserErrorCode.USER_UPDATE_FAILED]: 'Failed to update user',
  [UserErrorCode.USER_DELETE_FAILED]: 'Failed to delete user',
  [UserErrorCode.INVALID_USER_ID]: 'Invalid user ID format',
  [UserErrorCode.REFRESH_TOKEN_UPDATE_FAILED]: 'Failed to update refresh token',
  [UserErrorCode.STATE_ARCHIVE_NOT_FOUND]: 'State archive not found for user',
  [UserErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
