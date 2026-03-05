export enum ProfileErrorCode {
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  PROFILE_ALREADY_EXISTS = 'PROFILE_ALREADY_EXISTS',
  PROFILE_CREATION_FAILED = 'PROFILE_CREATION_FAILED',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED',
  PROFILE_DELETE_FAILED = 'PROFILE_DELETE_FAILED',
  INVALID_PROFILE_DATA = 'INVALID_PROFILE_DATA',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const ProfileErrorMessages: Record<ProfileErrorCode, string> = {
  [ProfileErrorCode.PROFILE_NOT_FOUND]: 'Profile not found',
  [ProfileErrorCode.PROFILE_ALREADY_EXISTS]:
    'Profile already exists for this user',
  [ProfileErrorCode.PROFILE_CREATION_FAILED]: 'Failed to create profile',
  [ProfileErrorCode.PROFILE_UPDATE_FAILED]: 'Failed to update profile',
  [ProfileErrorCode.PROFILE_DELETE_FAILED]: 'Failed to delete profile',
  [ProfileErrorCode.INVALID_PROFILE_DATA]: 'Invalid profile data',
  [ProfileErrorCode.USER_NOT_FOUND]: 'User not found',
  [ProfileErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
