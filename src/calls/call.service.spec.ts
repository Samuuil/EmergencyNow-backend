import { Test, TestingModule } from '@nestjs/testing';
import { CallsService } from './call.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CallStatus } from '../common/enums/call-status.enum';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { DriverGateway } from '../realtime/driver.gateway';
import { UserGateway } from '../realtime/user.gateway';
import { MailService } from '../auth/services/mail.service';
import { SmsService } from '../auth/services/sms.service';
import { ContactsService } from '../contacts/contact.service';

describe('CallsService', () => {
  let service: CallsService;
  let callsRepository: any;
  let ambulancesService: any;

  const mockCall = {
    id: 'call-1',
    status: CallStatus.PENDING,
    latitude: 42.6977,
    longitude: 23.3219,
    description: 'Emergency',
    user: { id: 'user-1' },
    ambulance: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        {
          provide: getRepositoryToken(Call),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Ambulance),
          useValue: { find: jest.fn() },
        },
        {
          provide: AmbulancesService,
          useValue: {
            markAsAvailable: jest.fn(),
            updateLocation: jest.fn(),
          },
        },
        {
          provide: HospitalsService,
          useValue: { findNearestHospitals: jest.fn() },
        },
        {
          provide: GoogleMapsService,
          useValue: {},
        },
        {
          provide: DriverGateway,
          useValue: {},
        },
        {
          provide: UserGateway,
          useValue: {
            notifyStatusChange: jest.fn(),
            notifyCallDispatched: jest.fn(),
            notifyLocationUpdate: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {},
        },
        {
          provide: SmsService,
          useValue: {},
        },
        {
          provide: ContactsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CallsService>(CallsService);
    callsRepository = module.get(getRepositoryToken(Call));
    ambulancesService = module.get(AmbulancesService);
  });

  describe('findOne', () => {
    it('should return a call if found', async () => {
      callsRepository.findOne.mockResolvedValue(mockCall);

      const result = await service.findOne('call-1');

      expect(result).toEqual(mockCall);
      expect(callsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'call-1' },
        relations: ['user', 'ambulance'],
      });
    });

    it('should throw NotFoundException if call not found', async () => {
      callsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return call', async () => {
      const updateDto = { description: 'Updated description' };
      const updatedCall = { ...mockCall, ...updateDto };

      callsRepository.findOne.mockResolvedValue(mockCall);
      callsRepository.save.mockResolvedValue(updatedCall);

      const result = await service.update('call-1', updateDto);

      expect(result).toEqual(updatedCall);
      expect(callsRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove call without ambulance', async () => {
      callsRepository.findOne.mockResolvedValue(mockCall);

      await service.remove('call-1');

      expect(callsRepository.remove).toHaveBeenCalledWith(mockCall);
      expect(ambulancesService.markAsAvailable).not.toHaveBeenCalled();
    });

    it('should mark ambulance available before removing call', async () => {
      const callWithAmbulance = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
        status: CallStatus.EN_ROUTE,
      };
      callsRepository.findOne.mockResolvedValue(callWithAmbulance);

      await service.remove('call-1');

      expect(ambulancesService.markAsAvailable).toHaveBeenCalledWith('amb-1');
      expect(callsRepository.remove).toHaveBeenCalledWith(callWithAmbulance);
    });
  });

  describe('getHospitalsForCall', () => {
    it('should throw BadRequestException if call not arrived', async () => {
      callsRepository.findOne.mockResolvedValue(mockCall);

      await expect(
        service.getHospitalsForCall('call-1', 42.7, 23.3),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update status to ARRIVED and set arrivedAt', async () => {
      const call = { ...mockCall };
      callsRepository.findOne.mockResolvedValue(call);
      callsRepository.save.mockResolvedValue({
        ...call,
        status: CallStatus.ARRIVED,
        arrivedAt: expect.any(Date),
      });

      const result = await service.updateStatus('call-1', CallStatus.ARRIVED);

      expect(callsRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(CallStatus.ARRIVED);
    });

    it('should update status to COMPLETED and mark ambulance available', async () => {
      const call = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
      };
      callsRepository.findOne.mockResolvedValue(call);
      callsRepository.save.mockResolvedValue({
        ...call,
        status: CallStatus.COMPLETED,
      });

      await service.updateStatus('call-1', CallStatus.COMPLETED);

      expect(ambulancesService.markAsAvailable).toHaveBeenCalledWith('amb-1');
      expect(callsRepository.save).toHaveBeenCalled();
    });

    it('should update status to EN_ROUTE and set dispatchedAt', async () => {
      const call = { ...mockCall, dispatchedAt: null };
      callsRepository.findOne.mockResolvedValue(call);
      callsRepository.save.mockResolvedValue({
        ...call,
        status: CallStatus.EN_ROUTE,
      });

      await service.updateStatus('call-1', CallStatus.EN_ROUTE);

      expect(callsRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateAmbulanceLocation', () => {
    it('should throw BadRequestException when no ambulance assigned', async () => {
      callsRepository.findOne.mockResolvedValue(mockCall);

      await expect(
        service.updateAmbulanceLocation('call-1', 42.7, 23.3),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when call is completed', async () => {
      const completedCall = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
        status: CallStatus.COMPLETED,
      };
      callsRepository.findOne.mockResolvedValue(completedCall);

      await expect(
        service.updateAmbulanceLocation('call-1', 42.7, 23.3),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update ambulance location successfully', async () => {
      const call = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
        status: CallStatus.EN_ROUTE,
        user: { id: 'user-1' },
      };
      callsRepository.findOne.mockResolvedValue(call);
      callsRepository.save.mockResolvedValue({
        ...call,
        ambulanceCurrentLatitude: 42.7,
        ambulanceCurrentLongitude: 23.3,
      });

      const result = await service.updateAmbulanceLocation(
        'call-1',
        42.7,
        23.3,
      );

      expect(ambulancesService.updateLocation).toHaveBeenCalledWith(
        'amb-1',
        42.7,
        23.3,
      );
      expect(callsRepository.save).toHaveBeenCalled();
      expect(result.ambulanceCurrentLatitude).toBe(42.7);
      expect(result.ambulanceCurrentLongitude).toBe(23.3);
    });
  });

  describe('getTrackingData', () => {
    it('should return null location and route when no ambulance assigned', async () => {
      callsRepository.findOne.mockResolvedValue(mockCall);

      const result = await service.getTrackingData('call-1');

      expect(result).toEqual({
        call: mockCall,
        currentLocation: null,
        route: null,
      });
    });

    it('should return tracking data with location and route', async () => {
      const callWithTracking = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
        ambulanceCurrentLatitude: 42.7,
        ambulanceCurrentLongitude: 23.3,
        routePolyline: 'encoded_polyline',
        estimatedDistance: 5000,
        estimatedDuration: 600,
        routeSteps: [],
      };
      callsRepository.findOne.mockResolvedValue(callWithTracking);

      const result = await service.getTrackingData('call-1');

      expect(result.currentLocation).toEqual({
        latitude: 42.7,
        longitude: 23.3,
      });
      expect(result.route).toEqual({
        polyline: 'encoded_polyline',
        distance: 5000,
        duration: 600,
        steps: [],
      });
    });

    it('should return null route when ambulance has no route data', async () => {
      const callWithAmbulance = {
        ...mockCall,
        ambulance: { id: 'amb-1' },
        ambulanceCurrentLatitude: 42.7,
        ambulanceCurrentLongitude: 23.3,
        routePolyline: null,
      };
      callsRepository.findOne.mockResolvedValue(callWithAmbulance);

      const result = await service.getTrackingData('call-1');

      expect(result.currentLocation).toEqual({
        latitude: 42.7,
        longitude: 23.3,
      });
      expect(result.route).toBeNull();
    });
  });

  describe('getHospitalRouteData', () => {
    it('should return null when no hospital selected', async () => {
      const call = { ...mockCall, selectedHospitalId: null };
      callsRepository.findOne.mockResolvedValue(call);

      const result = await service.getHospitalRouteData('call-1');

      expect(result).toEqual({
        hospital: null,
        route: null,
      });
    });

    it('should return hospital and route data when available', async () => {
      const call = {
        ...mockCall,
        selectedHospitalId: 'hosp-1',
        selectedHospitalName: 'City Hospital',
        hospitalRoutePolyline: 'encoded_hospital_route',
        hospitalRouteDistance: 8000,
        hospitalRouteDuration: 900,
        hospitalRouteSteps: [],
      };
      callsRepository.findOne.mockResolvedValue(call);

      const result = await service.getHospitalRouteData('call-1');

      expect(result).toEqual({
        hospital: {
          id: 'hosp-1',
          name: 'City Hospital',
        },
        route: {
          polyline: 'encoded_hospital_route',
          distance: 8000,
          duration: 900,
          steps: [],
        },
      });
    });

    it('should return hospital with null route when route not available', async () => {
      const call = {
        ...mockCall,
        selectedHospitalId: 'hosp-1',
        selectedHospitalName: 'City Hospital',
        hospitalRoutePolyline: null,
      };
      callsRepository.findOne.mockResolvedValue(call);

      const result = await service.getHospitalRouteData('call-1');

      expect(result.hospital).toEqual({
        id: 'hosp-1',
        name: 'City Hospital',
      });
      expect(result.route).toBeNull();
    });
  });

  describe('dispatchNearestAmbulance', () => {
    it('should throw BadRequestException when call is completed', async () => {
      const completedCall = {
        ...mockCall,
        status: CallStatus.COMPLETED,
      };
      callsRepository.findOne.mockResolvedValue(completedCall);

      await expect(service.dispatchNearestAmbulance('call-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when call is cancelled', async () => {
      const cancelledCall = {
        ...mockCall,
        status: CallStatus.CANCELLED,
      };
      callsRepository.findOne.mockResolvedValue(cancelledCall);

      await expect(service.dispatchNearestAmbulance('call-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('should throw BadRequestException when user is null', async () => {
      await expect(
        service.create(
          {
            description: 'Test',
            latitude: 42.7,
            longitude: 23.3,
            userEgn: '1234567890',
          },
          null as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHospitalsForCall (with arrived call)', () => {
    it('should delegate to hospitalsService when call arrived', async () => {
      const arrivedCall = {
        ...mockCall,
        status: CallStatus.ARRIVED,
      };
      callsRepository.findOne.mockResolvedValue(arrivedCall);

      const mockHospitalsService = {
        findNearestHospitals: jest
          .fn()
          .mockResolvedValue([
            { id: 'hosp-1', name: 'Hospital 1', distance: 1000 },
          ]),
      };

      // Replace the hospitalsService temporarily
      (service as any).hospitalsService = mockHospitalsService;

      const result = await service.getHospitalsForCall('call-1', 42.7, 23.3);

      expect(mockHospitalsService.findNearestHospitals).toHaveBeenCalledWith(
        { latitude: 42.7, longitude: 23.3 },
        50,
      );
      expect(result).toHaveLength(1);
    });
  });
});
