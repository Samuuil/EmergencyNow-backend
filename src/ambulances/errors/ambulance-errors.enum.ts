export enum AmbulanceErrorCode {
  AMBULANCE_NOT_FOUND = 'AMBULANCE_NOT_FOUND',
  AMBULANCE_ALREADY_EXISTS = 'AMBULANCE_ALREADY_EXISTS',
  INVALID_LICENSE_PLATE = 'INVALID_LICENSE_PLATE',
  DRIVER_NOT_FOUND = 'DRIVER_NOT_FOUND',
  DRIVER_ALREADY_ASSIGNED = 'DRIVER_ALREADY_ASSIGNED',
  AMBULANCE_NOT_AVAILABLE = 'AMBULANCE_NOT_AVAILABLE',
  NO_AVAILABLE_AMBULANCES = 'NO_AVAILABLE_AMBULANCES',
  LOCATION_UPDATE_FAILED = 'LOCATION_UPDATE_FAILED',
  INVALID_LOCATION = 'INVALID_LOCATION',
  AMBULANCE_CREATION_FAILED = 'AMBULANCE_CREATION_FAILED',
  AMBULANCE_UPDATE_FAILED = 'AMBULANCE_UPDATE_FAILED',
  AMBULANCE_DELETE_FAILED = 'AMBULANCE_DELETE_FAILED',
  DRIVER_ASSIGNMENT_FAILED = 'DRIVER_ASSIGNMENT_FAILED',
  DRIVER_REMOVAL_FAILED = 'DRIVER_REMOVAL_FAILED',
  DISTANCE_CALCULATION_FAILED = 'DISTANCE_CALCULATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const AmbulanceErrorMessages: Record<AmbulanceErrorCode, string> = {
  [AmbulanceErrorCode.AMBULANCE_NOT_FOUND]: 'Ambulance not found',
  [AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS]:
    'Ambulance with this license plate already exists',
  [AmbulanceErrorCode.INVALID_LICENSE_PLATE]: 'Invalid license plate format',
  [AmbulanceErrorCode.DRIVER_NOT_FOUND]: 'Driver not found',
  [AmbulanceErrorCode.DRIVER_ALREADY_ASSIGNED]:
    'Driver is already assigned to another ambulance',
  [AmbulanceErrorCode.AMBULANCE_NOT_AVAILABLE]: 'Ambulance is not available',
  [AmbulanceErrorCode.NO_AVAILABLE_AMBULANCES]: 'No available ambulances found',
  [AmbulanceErrorCode.LOCATION_UPDATE_FAILED]:
    'Failed to update ambulance location',
  [AmbulanceErrorCode.INVALID_LOCATION]: 'Invalid location coordinates',
  [AmbulanceErrorCode.AMBULANCE_CREATION_FAILED]: 'Failed to create ambulance',
  [AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]: 'Failed to update ambulance',
  [AmbulanceErrorCode.AMBULANCE_DELETE_FAILED]: 'Failed to delete ambulance',
  [AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED]:
    'Failed to assign driver to ambulance',
  [AmbulanceErrorCode.DRIVER_REMOVAL_FAILED]:
    'Failed to remove driver from ambulance',
  [AmbulanceErrorCode.DISTANCE_CALCULATION_FAILED]:
    'Failed to calculate distance',
  [AmbulanceErrorCode.DATABASE_ERROR]: 'Database operation failed',
};
