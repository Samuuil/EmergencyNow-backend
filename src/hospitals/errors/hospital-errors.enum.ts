export enum HospitalErrorCode {
  HOSPITAL_NOT_FOUND = 'HOSPITAL_NOT_FOUND',
  HOSPITAL_ALREADY_EXISTS = 'HOSPITAL_ALREADY_EXISTS',
  HOSPITAL_CREATION_FAILED = 'HOSPITAL_CREATION_FAILED',
  HOSPITAL_UPDATE_FAILED = 'HOSPITAL_UPDATE_FAILED',
  HOSPITAL_DELETE_FAILED = 'HOSPITAL_DELETE_FAILED',
  INVALID_LOCATION = 'INVALID_LOCATION',
  NO_HOSPITALS_FOUND = 'NO_HOSPITALS_FOUND',
  GOOGLE_PLACES_SYNC_FAILED = 'GOOGLE_PLACES_SYNC_FAILED',
  DISTANCE_CALCULATION_FAILED = 'DISTANCE_CALCULATION_FAILED',
  INVALID_HOSPITAL_DATA = 'INVALID_HOSPITAL_DATA',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const HospitalErrorMessages: Record<HospitalErrorCode, string> = {
  [HospitalErrorCode.HOSPITAL_NOT_FOUND]: 'Hospital not found',
  [HospitalErrorCode.HOSPITAL_ALREADY_EXISTS]: 'Hospital already exists',
  [HospitalErrorCode.HOSPITAL_CREATION_FAILED]: 'Failed to create hospital',
  [HospitalErrorCode.HOSPITAL_UPDATE_FAILED]: 'Failed to update hospital',
  [HospitalErrorCode.HOSPITAL_DELETE_FAILED]: 'Failed to delete hospital',
  [HospitalErrorCode.INVALID_LOCATION]: 'Invalid location coordinates',
  [HospitalErrorCode.NO_HOSPITALS_FOUND]: 'No hospitals found',
  [HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED]: 'Failed to sync hospitals from Google Places',
  [HospitalErrorCode.DISTANCE_CALCULATION_FAILED]: 'Failed to calculate distance to hospital',
  [HospitalErrorCode.INVALID_HOSPITAL_DATA]: 'Invalid hospital data',
  [HospitalErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
