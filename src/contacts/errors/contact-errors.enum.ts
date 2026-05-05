export enum ContactErrorCode {
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  CONTACT_CREATION_FAILED = 'CONTACT_CREATION_FAILED',
  CONTACT_UPDATE_FAILED = 'CONTACT_UPDATE_FAILED',
  CONTACT_DELETE_FAILED = 'CONTACT_DELETE_FAILED',
  MAX_CONTACTS_REACHED = 'MAX_CONTACTS_REACHED',
  INVALID_CONTACT_DATA = 'INVALID_CONTACT_DATA',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED_CONTACT_ACCESS = 'UNAUTHORIZED_CONTACT_ACCESS',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const ContactErrorMessages: Record<ContactErrorCode, string> = {
  [ContactErrorCode.CONTACT_NOT_FOUND]: 'Contact not found',
  [ContactErrorCode.CONTACT_CREATION_FAILED]: 'Failed to create contact',
  [ContactErrorCode.CONTACT_UPDATE_FAILED]: 'Failed to update contact',
  [ContactErrorCode.CONTACT_DELETE_FAILED]: 'Failed to delete contact',
  [ContactErrorCode.MAX_CONTACTS_REACHED]: 'Maximum number of contacts reached',
  [ContactErrorCode.INVALID_CONTACT_DATA]: 'Invalid contact data',
  [ContactErrorCode.INVALID_PHONE_NUMBER]:
    'Phone number must be a valid Bulgarian phone number (e.g. +359881234567 or 0881234567)',
  [ContactErrorCode.USER_NOT_FOUND]: 'User not found',
  [ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS]:
    'You can only access your own contacts',
  [ContactErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
