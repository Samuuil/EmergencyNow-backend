export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  VERIFICATION_CODE_NOT_FOUND = 'VERIFICATION_CODE_NOT_FOUND',
  USER_NOT_IN_STATE_ARCHIVE = 'USER_NOT_IN_STATE_ARCHIVE',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  TOKEN_GENERATION_FAILED = 'TOKEN_GENERATION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',
  VERIFICATION_CODE_GENERATION_FAILED = 'VERIFICATION_CODE_GENERATION_FAILED',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  INVALID_LOGIN_METHOD = 'INVALID_LOGIN_METHOD',
}

export const AuthErrorMessages: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials provided',
  [AuthErrorCode.INVALID_VERIFICATION_CODE]: 'Invalid verification code',
  [AuthErrorCode.VERIFICATION_CODE_EXPIRED]: 'Verification code has expired',
  [AuthErrorCode.VERIFICATION_CODE_NOT_FOUND]: 'Verification code not found',
  [AuthErrorCode.USER_NOT_IN_STATE_ARCHIVE]: 'User not found in state archive',
  [AuthErrorCode.INVALID_REFRESH_TOKEN]: 'Invalid refresh token',
  [AuthErrorCode.REFRESH_TOKEN_EXPIRED]: 'Refresh token has expired',
  [AuthErrorCode.TOKEN_GENERATION_FAILED]:
    'Failed to generate authentication tokens',
  [AuthErrorCode.UNAUTHORIZED_ACCESS]: 'Unauthorized access',
  [AuthErrorCode.EMAIL_SEND_FAILED]: 'Failed to send verification email',
  [AuthErrorCode.SMS_SEND_FAILED]: 'Failed to send verification SMS',
  [AuthErrorCode.VERIFICATION_CODE_GENERATION_FAILED]:
    'Failed to generate verification code',
  [AuthErrorCode.LOGOUT_FAILED]: 'Failed to logout user',
  [AuthErrorCode.INVALID_LOGIN_METHOD]: 'Invalid login method',
};
