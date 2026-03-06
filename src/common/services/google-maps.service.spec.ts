import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleMapsService } from './google-maps.service';

global.fetch = jest.fn();

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue('test-api-key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMapsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GoogleMapsService>(GoogleMapsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRoute', () => {
    const origin = { latitude: 42.6977, longitude: 23.3219 };
    const destination = { latitude: 42.7, longitude: 23.35 };

    it('should get route successfully', async () => {
      const mockResponse = {
        routes: [
          {
            legs: [
              {
                distanceMeters: 5000,
                duration: '600s',
                polyline: {
                  encodedPolyline: 'encoded_polyline_string',
                },
                steps: [
                  {
                    distanceMeters: 1000,
                    staticDuration: '120s',
                    navigationInstruction: {
                      instructions: 'Turn left',
                    },
                    startLocation: {
                      latLng: { latitude: 42.6977, longitude: 23.3219 },
                    },
                    endLocation: {
                      latLng: { latitude: 42.698, longitude: 23.323 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.getRoute(origin, destination);

      expect(result).toEqual({
        distance: 5000,
        duration: 600,
        polyline: 'encoded_polyline_string',
        steps: [
          {
            distance: 1000,
            duration: 120,
            instruction: 'Turn left',
            startLocation: { lat: 42.6977, lng: 23.3219 },
            endLocation: { lat: 42.698, lng: 23.323 },
          },
        ],
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'test-api-key',
          }),
        }),
      );
    });

    it('should throw error when no route found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ routes: [] }),
      } as Response);

      await expect(service.getRoute(origin, destination)).rejects.toThrow(
        'No route found',
      );
    });

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      } as Response);

      await expect(service.getRoute(origin, destination)).rejects.toThrow(
        'Routes API error: 400 - Bad request',
      );
    });
  });

  describe('getDistanceAndDuration', () => {
    const origin = { latitude: 42.6977, longitude: 23.3219 };
    const destination = { latitude: 42.7, longitude: 23.35 };

    it('should get distance and duration successfully', async () => {
      const mockResponse = [
        {
          distanceMeters: 5000,
          duration: '600s',
          status: 'OK',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.getDistanceAndDuration(origin, destination);

      expect(result).toEqual({
        distance: 5000,
        duration: 600,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'test-api-key',
          }),
        }),
      );
    });

    it('should throw error when status is not OK', async () => {
      const mockResponse = [
        {
          status: 'NOT_FOUND',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(
        service.getDistanceAndDuration(origin, destination),
      ).rejects.toThrow('No route available: NOT_FOUND');
    });

    it('should throw error when no data returned', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await expect(
        service.getDistanceAndDuration(origin, destination),
      ).rejects.toThrow('No distance data returned');
    });

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      } as Response);

      await expect(
        service.getDistanceAndDuration(origin, destination),
      ).rejects.toThrow('Routes API error: 500 - Internal server error');
    });
  });

  describe('getDistancesToMultipleDestinations', () => {
    const origin = { latitude: 42.6977, longitude: 23.3219 };
    const destinations = [
      { latitude: 42.7, longitude: 23.35 },
      { latitude: 42.75, longitude: 23.4 },
    ];

    it('should get distances to multiple destinations successfully', async () => {
      const mockResponse = [
        {
          distanceMeters: 5000,
          duration: '600s',
          status: 'OK',
        },
        {
          distanceMeters: 8000,
          duration: '900s',
          status: 'OK',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.getDistancesToMultipleDestinations(
        origin,
        destinations,
      );

      expect(result).toEqual([
        { distance: 5000, duration: 600 },
        { distance: 8000, duration: 900 },
      ]);
    });

    it('should return Infinity for destinations with non-OK status', async () => {
      const mockResponse = [
        {
          distanceMeters: 5000,
          duration: '600s',
          status: 'OK',
        },
        {
          status: 'NOT_FOUND',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.getDistancesToMultipleDestinations(
        origin,
        destinations,
      );

      expect(result).toEqual([
        { distance: 5000, duration: 600 },
        { distance: Infinity, duration: Infinity },
      ]);
    });

    it('should return Infinity for all destinations when no data returned', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const result = await service.getDistancesToMultipleDestinations(
        origin,
        destinations,
      );

      expect(result).toEqual([
        { distance: Infinity, duration: Infinity },
        { distance: Infinity, duration: Infinity },
      ]);
    });

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      } as Response);

      await expect(
        service.getDistancesToMultipleDestinations(origin, destinations),
      ).rejects.toThrow('Routes API error: 403 - Forbidden');
    });
  });

  describe('findHospitalsByTextSearch', () => {
    const location = { latitude: 42.6977, longitude: 23.3219 };
    const radius = 10000;

    it('should find hospitals successfully', async () => {
      const mockResponse = {
        places: [
          {
            displayName: { text: 'City Hospital' },
            formattedAddress: '123 Main St',
            location: { latitude: 42.7, longitude: 23.32 },
            id: 'place-1',
            types: ['hospital', 'health'],
          },
          {
            displayName: { text: 'Medical Center' },
            formattedAddress: '456 Oak Ave',
            location: { latitude: 42.71, longitude: 23.33 },
            id: 'place-2',
            types: ['hospital', 'point_of_interest'],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.findHospitalsByTextSearch(location, radius);

      expect(result).toEqual([
        {
          name: 'City Hospital',
          address: '123 Main St',
          location: { lat: 42.7, lng: 23.32 },
          placeId: 'place-1',
        },
        {
          name: 'Medical Center',
          address: '456 Oak Ave',
          location: { lat: 42.71, lng: 23.33 },
          placeId: 'place-2',
        },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchText',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'test-api-key',
          }),
        }),
      );
    });

    it('should filter out non-hospital places', async () => {
      const mockResponse = {
        places: [
          {
            displayName: { text: 'City Hospital' },
            formattedAddress: '123 Main St',
            location: { latitude: 42.7, longitude: 23.32 },
            id: 'place-1',
            types: ['hospital', 'health'],
          },
          {
            displayName: { text: 'Dental Clinic' },
            formattedAddress: '789 Elm St',
            location: { latitude: 42.72, longitude: 23.34 },
            id: 'place-3',
            types: ['dentist', 'health'],
          },
          {
            displayName: { text: 'Doctor Office' },
            formattedAddress: '101 Pine St',
            location: { latitude: 42.73, longitude: 23.35 },
            id: 'place-4',
            types: ['doctor', 'health'],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.findHospitalsByTextSearch(location, radius);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('City Hospital');
    });

    it('should return empty array when no hospitals found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      } as Response);

      const result = await service.findHospitalsByTextSearch(location, radius);

      expect(result).toEqual([]);
    });

    it('should use default radius when not provided', async () => {
      const mockResponse = { places: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.findHospitalsByTextSearch(location);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchText',
        expect.objectContaining({
          body: expect.stringContaining('"radius":10000'),
        }),
      );
    });

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(
        service.findHospitalsByTextSearch(location, radius),
      ).rejects.toThrow('Places API error: 401 - Unauthorized');
    });
  });
});
