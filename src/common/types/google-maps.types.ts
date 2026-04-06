export interface GoogleMapsLatLng {
  latitude: number;
  longitude: number;
}

export interface GoogleMapsLocation {
  latLng: GoogleMapsLatLng;
}

export interface GoogleMapsRoute {
  legs: Array<{
    distanceMeters: number;
    duration: string;
    polyline: {
      encodedPolyline: string;
    };
    steps: Array<{
      distanceMeters: number;
      staticDuration: string;
      navigationInstruction: {
        instructions: string;
      };
      startLocation: {
        latLng: GoogleMapsLatLng;
      };
      endLocation: {
        latLng: GoogleMapsLatLng;
      };
    }>;
  }>;
}

export interface GoogleMapsRoutesResponse {
  routes: GoogleMapsRoute[];
}

export interface GoogleMapsDistanceMatrixElement {
  status: string;
  distanceMeters: number;
  duration: string;
}

export interface GoogleMapsDistanceMatrixResponse {
  originIndex: number;
  destinationIndex: number;
  status?: {
    code?: number;
    message?: string;
  };
  condition: string;
  distanceMeters?: number;
  duration?: string;
  localizedValues?: {
    distance?: {
      text?: string;
    };
    duration?: {
      text?: string;
    };
  };
}

export interface GoogleMapsPlace {
  id: string;
  displayName: {
    text: string;
  };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  types: string[];
}

export interface GoogleMapsPlacesResponse {
  places: GoogleMapsPlace[];
}
