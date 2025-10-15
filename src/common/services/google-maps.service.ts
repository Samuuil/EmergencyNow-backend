import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, TravelMode, DirectionsResponse } from '@googlemaps/google-maps-services-js';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
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
  distance: number; // in meters
  duration: number; // in seconds
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
      const response = await this.client.directions({
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          mode: TravelMode.driving,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        throw new Error(`No route found: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.value,
        duration: leg.duration.value,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step) => ({
          distance: step.distance.value,
          duration: step.duration.value,
          instruction: step.html_instructions,
          startLocation: step.start_location,
          endLocation: step.end_location,
        })),
      };
    } catch (error) {
      this.logger.error(`Error calculating route: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDistanceAndDuration(
    origin: Location,
    destination: Location,
  ): Promise<DistanceMatrixResult> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [`${origin.latitude},${origin.longitude}`],
          destinations: [`${destination.latitude},${destination.longitude}`],
          mode: TravelMode.driving,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance matrix error: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];

      if (element.status !== 'OK') {
        throw new Error(`No route available: ${element.status}`);
      }

      return {
        distance: element.distance.value,
        duration: element.duration.value,
      };
    } catch (error) {
      this.logger.error(`Error calculating distance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDistancesToMultipleDestinations(
    origin: Location,
    destinations: Location[],
  ): Promise<DistanceMatrixResult[]> {
    try {
      const destinationStrings = destinations.map(
        (dest) => `${dest.latitude},${dest.longitude}`,
      );

      const response = await this.client.distancematrix({
        params: {
          origins: [`${origin.latitude},${origin.longitude}`],
          destinations: destinationStrings,
          mode: TravelMode.driving,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance matrix error: ${response.data.status}`);
      }

      return response.data.rows[0].elements.map((element) => {
        if (element.status !== 'OK') {
          return { distance: Infinity, duration: Infinity };
        }
        return {
          distance: element.distance.value,
          duration: element.duration.value,
        };
      });
    } catch (error) {
      this.logger.error(
        `Error calculating distances to multiple destinations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findNearbyPlaces(
    location: Location,
    type: string,
    radius: number = 5000,
  ): Promise<
    Array<{
      name: string;
      address: string;
      location: { lat: number; lng: number };
      placeId: string;
    }>
  > {
    try {
      const url = 'https://places.googleapis.com/v1/places:searchNearby';
      
      const requestBody = {
        includedTypes: [type],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            radius: radius,
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Places API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.places || data.places.length === 0) {
        this.logger.warn('No places found in the specified area');
        return [];
      }

      return data.places.map((place: any) => ({
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || '',
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
        placeId: place.id || '',
      }));
    } catch (error) {
      this.logger.error(`Error finding nearby places: ${error.message}`, error.stack);
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

      // Calculate approximate degrees for radius (rough approximation: 1 degree ≈ 111km)
      const latOffset = (radius / 111000);
      const lngOffset = (radius / (111000 * Math.cos(location.latitude * Math.PI / 180)));

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
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.types',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Places API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.places || data.places.length === 0) {
        this.logger.warn('No hospitals found in the specified area');
        return [];
      }

      const hospitals = data.places.filter((place: any) => {
        const types = place.types || [];
        return types.includes('hospital') && !types.includes('doctor') && !types.includes('dentist');
      });

      return hospitals.map((place: any) => ({
        name: place.displayName?.text || 'Unknown Hospital',
        address: place.formattedAddress || '',
        location: {
          lat: place.location?.latitude ?? 0,
          lng: place.location?.longitude ?? 0,
        },
        placeId: place.id || '',
      }));
    } catch (error) {
      this.logger.error(`Error finding hospitals by text search: ${error.message}`, error.stack);
      throw error;
    }
  }

  

}
