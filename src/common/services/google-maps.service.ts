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
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GoogleMapsRoutesResponse;

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      const leg = route.legs?.[0];

      return {
        distance: route.legs?.[0]?.distanceMeters || 0,
        duration: parseInt(route.legs?.[0]?.duration?.replace('s', '') || '0'),
        polyline: route.legs?.[0]?.polyline?.encodedPolyline || '',
        steps:
          leg?.steps?.map((step) => ({
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
          })) || [],
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
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status',
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
        throw new Error('No distance data returned');
      }

      const element = data[0];

      if (element.status !== 'OK') {
        throw new Error(`No route available: ${element.status}`);
      }

      return {
        distance: element.distanceMeters || 0,
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
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status',
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
        if (element.status !== 'OK') {
          return { distance: Infinity, duration: Infinity };
        }
        return {
          distance: element.distanceMeters || 0,
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
