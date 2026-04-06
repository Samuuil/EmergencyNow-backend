import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@googlemaps/google-maps-services-js';
import {
  GoogleMapsRoutesResponse,
  GoogleMapsDistanceMatrixResponse,
  GoogleMapsPlacesResponse,
} from '../types/google-maps.types';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  polyline: string;
  steps: Array<{
    distance: number;
    duration: number;
    instruction: string;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>;
}

export interface DistanceMatrixResult {
  distance: number;
  duration: number;
}

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly client: Client;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    this.client = new Client({});
  }

  async getRoute(origin: Location, destination: Location): Promise<RouteInfo> {
    try {
      this.logger.debug(
        `Calculating route from (${origin.latitude}, ${origin.longitude}) to (${destination.latitude}, ${destination.longitude})`,
      );

      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        units: 'METRIC',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.startLocation.latLng,routes.legs.steps.endLocation.latLng',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Routes API HTTP error: ${response.status} - ${errorText}`,
        );
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GoogleMapsRoutesResponse;

      this.logger.debug(
        `Routes API response: ${JSON.stringify(data).substring(0, 500)}...`,
      );

      if (!data.routes || data.routes.length === 0) {
        this.logger.error('No routes found in response');
        throw new Error('No route found');
      }

      const route = data.routes[0];
      const leg = route.legs?.[0];

      if (!leg) {
        this.logger.error('No legs found in route');
        throw new Error('No route legs found');
      }

      const polyline = leg.polyline?.encodedPolyline || '';
      const steps = leg.steps || [];

      this.logger.debug(
        `Route calculated: distance=${leg.distanceMeters}m, duration=${leg.duration}, polyline length=${polyline.length}, steps count=${steps.length}`,
      );

      return {
        distance: leg.distanceMeters || 0,
        duration: parseInt(leg.duration?.replace('s', '') || '0'),
        polyline: polyline,
        steps: steps.map((step) => ({
          distance: step.distanceMeters || 0,
          duration: parseInt(step.staticDuration?.replace('s', '') || '0'),
          instruction: step.navigationInstruction?.instructions || '',
          startLocation: {
            lat: step.startLocation?.latLng?.latitude || 0,
            lng: step.startLocation?.latLng?.longitude || 0,
          },
          endLocation: {
            lat: step.endLocation?.latLng?.latitude || 0,
            lng: step.endLocation?.latLng?.longitude || 0,
          },
        })),
      };
    } catch (error) {
      this.logger.error(`Error calculating route: ${error}`);
      throw error;
    }
  }

  async getDistanceAndDuration(
    origin: Location,
    destination: Location,
  ): Promise<DistanceMatrixResult> {
    try {
      this.logger.debug(
        `Calculating distance from (${origin.latitude}, ${origin.longitude}) to (${destination.latitude}, ${destination.longitude})`,
      );

      const url =
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

      const requestBody = {
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                },
              },
            },
          },
        ],
        destinations: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                },
              },
            },
          },
        ],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        units: 'METRIC',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition,localizedValues',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Routes API HTTP error: ${response.status} - ${errorText}`,
        );
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();
      this.logger.debug(
        `Distance Matrix API raw response: ${JSON.stringify(rawData)}`,
      );

      // The API returns an array in the root response
      const data = Array.isArray(rawData)
        ? rawData
        : (rawData as any).data || [];

      if (!data || data.length === 0) {
        this.logger.error(
          `No distance data returned. Full response: ${JSON.stringify(rawData)}`,
        );
        throw new Error('No distance data returned');
      }

      const element = data[0];

      // Check condition instead of status (Routes API v2 uses condition)
      if (element.condition !== 'ROUTE_EXISTS') {
        this.logger.error(
          `Route calculation failed. Element: ${JSON.stringify(element)}. Condition: ${element.condition}`,
        );
        throw new Error(
          `No route available: condition=${element.condition}`,
        );
      }

      // If distanceMeters is missing, calculate straight-line distance as fallback
      if (!element.distanceMeters || element.distanceMeters === 0) {
        this.logger.warn(
          `Distance meters missing or zero from response. Full element: ${JSON.stringify(element)}. Calculating straight-line distance as fallback.`,
        );
        
        // Calculate Haversine distance as fallback
        const R = 6371000; // Earth's radius in meters
        const lat1 = (origin.latitude * Math.PI) / 180;
        const lat2 = (destination.latitude * Math.PI) / 180;
        const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
        const deltaLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLon / 2) *
            Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const straightLineDistance = R * c;

        // Estimate duration assuming 50 km/h average speed
        const estimatedDuration = Math.round((straightLineDistance / 1000) * 72); // seconds

        this.logger.warn(
          `Using fallback: straight-line distance=${straightLineDistance}m, estimated duration=${estimatedDuration}s`,
        );

        return {
          distance: Math.round(straightLineDistance),
          duration: estimatedDuration,
        };
      }

      return {
        distance: element.distanceMeters,
        duration: parseInt(element.duration?.replace('s', '') || '0'),
      };
    } catch (error) {
      this.logger.error(`Error calculating distance: ${error}`);
      throw error;
    }
  }

  async getDistancesToMultipleDestinations(
    origin: Location,
    destinations: Location[],
  ): Promise<DistanceMatrixResult[]> {
    try {
      const url =
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

      const requestBody = {
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                },
              },
            },
          },
        ],
        destinations: destinations.map((dest) => ({
          waypoint: {
            location: {
              latLng: {
                latitude: dest.latitude,
                longitude: dest.longitude,
              },
            },
          },
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        units: 'METRIC',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition,localizedValues',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const data =
        (await response.json()) as GoogleMapsDistanceMatrixResponse[];

      if (!data || data.length === 0) {
        return destinations.map(() => ({
          distance: Infinity,
          duration: Infinity,
        }));
      }

      return data.map((element) => {
        // Check condition instead of status (Routes API v2 uses condition)
        if (element.condition !== 'ROUTE_EXISTS' || !element.distanceMeters) {
          return { distance: Infinity, duration: Infinity };
        }
        return {
          distance: element.distanceMeters,
          duration: parseInt(element.duration?.replace('s', '') || '0'),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error calculating distances to multiple destinations: ${error}`,
      );
      throw error;
    }
  }

  async findHospitalsByTextSearch(
    location: Location,
    radius: number = 10000,
  ): Promise<
    Array<{
      name: string;
      address: string;
      location: { lat: number; lng: number };
      placeId: string;
    }>
  > {
    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';

      // Remove unused variables
      // const latOffset = radius / 111000;
      // const lngOffset = radius / (111000 * Math.cos((location.latitude * Math.PI) / 180));

      const requestBody = {
        textQuery: 'hospital',
        locationBias: {
          circle: {
            center: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            radius: radius,
          },
        },
        maxResultCount: 20,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.location,places.id,places.types',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Places API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GoogleMapsPlacesResponse;

      if (!data.places || data.places.length === 0) {
        this.logger.warn('No hospitals found in the specified area');
        return [];
      }

      const hospitals = data.places.filter((place) => {
        const types = place.types || [];
        return (
          types.includes('hospital') &&
          !types.includes('doctor') &&
          !types.includes('dentist')
        );
      });

      return hospitals.map((place) => ({
        name: place.displayName?.text || 'Unknown Hospital',
        address: place.formattedAddress || '',
        location: {
          lat: place.location?.latitude ?? 0,
          lng: place.location?.longitude ?? 0,
        },
        placeId: place.id || '',
      }));
    } catch (error) {
      this.logger.error(`Error finding hospitals by text search: ${error}`);
      throw error;
    }
  }
}
