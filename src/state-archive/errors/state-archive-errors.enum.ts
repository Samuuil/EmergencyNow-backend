export enum StateArchiveErrorCode {
  STATE_ARCHIVE_NOT_FOUND = 'STATE_ARCHIVE_NOT_FOUND',
  STATE_ARCHIVE_ALREADY_EXISTS = 'STATE_ARCHIVE_ALREADY_EXISTS',
  STATE_ARCHIVE_CREATION_FAILED = 'STATE_ARCHIVE_CREATION_FAILED',
  STATE_ARCHIVE_UPDATE_FAILED = 'STATE_ARCHIVE_UPDATE_FAILED',
  STATE_ARCHIVE_DELETE_FAILED = 'STATE_ARCHIVE_DELETE_FAILED',
  INVALID_EGN = 'INVALID_EGN',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  EGN_ALREADY_EXISTS = 'EGN_ALREADY_EXISTS',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const StateArchiveErrorMessages: Record<StateArchiveErrorCode, string> = {
  [StateArchiveErrorCode.STATE_ARCHIVE_NOT_FOUND]: 'State archive record not found',
  [StateArchiveErrorCode.STATE_ARCHIVE_ALREADY_EXISTS]: 'State archive record already exists',
  [StateArchiveErrorCode.STATE_ARCHIVE_CREATION_FAILED]: 'Failed to create state archive record',
  [StateArchiveErrorCode.STATE_ARCHIVE_UPDATE_FAILED]: 'Failed to update state archive record',
  [StateArchiveErrorCode.STATE_ARCHIVE_DELETE_FAILED]: 'Failed to delete state archive record',
  [StateArchiveErrorCode.INVALID_EGN]: 'Invalid EGN format',
  [StateArchiveErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [StateArchiveErrorCode.INVALID_PHONE_NUMBER]: 'Invalid phone number',
  [StateArchiveErrorCode.EGN_ALREADY_EXISTS]: 'EGN already exists in state archive',
  [StateArchiveErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
