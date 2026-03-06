import { Test, TestingModule } from '@nestjs/testing';
import { CallsController } from './call.controller';
import { CallsService } from './call.service';
import { Call } from './entities/call.entity';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { User } from '../users/entities/user.entity';
import { CallStatus } from '../common/enums/call-status.enum';
import { Role } from '../common/enums/role.enum';
import { PaginateQuery } from 'nestjs-paginate';

describe('CallsController', () => {
  let controller: CallsController;
  let service: jest.Mocked<CallsService>;

  const mockUser: User = {
    id: 'user-123',
    role: Role.USER,
    refreshToken: undefined,
    profile: null as any,
    contacts: [],
    calls: [],
    stateArchive: null as any,
  };

  const mockCall = {
    id: 'call-123',
    description: 'Emergency',
    latitude: 42.6977,
    longitude: 23.3219,
    userEgn: '1234567890',
    status: CallStatus.PENDING,
    user: mockUser,
    ambulance: null as any,
    createdAt: new Date(),
    dispatchedAt: null as any,
    arrivedAt: null as any,
    completedAt: null as any,
    ambulanceCurrentLatitude: null as any,
    ambulanceCurrentLongitude: null as any,
    routePolyline: null as any,
    estimatedDistance: null as any,
    estimatedDuration: null as any,
    routeSteps: null as any,
    selectedHospitalId: null as any,
    selectedHospitalName: null as any,
    hospitalRoutePolyline: null as any,
    hospitalRouteDistance: null as any,
    hospitalRouteDuration: null as any,
    hospitalRouteSteps: null as any,
  } as unknown as Call;

  const mockCallsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    dispatchNearestAmbulance: jest.fn(),
    updateAmbulanceLocation: jest.fn(),
    updateStatus: jest.fn(),
    getTrackingData: jest.fn(),
    getHospitalsForCall: jest.fn(),
    selectHospitalForCall: jest.fn(),
    getHospitalRouteData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallsController],
      providers: [
        {
          provide: CallsService,
          useValue: mockCallsService,
        },
      ],
    }).compile();

    controller = module.get<CallsController>(CallsController);
    service = module.get(CallsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createCallDto: CreateCallDto = {
      description: 'Emergency',
      latitude: 42.6977,
      longitude: 23.3219,
      userEgn: '1234567890',
    };

    it('should create a call', async () => {
      service.create.mockResolvedValue(mockCall);

      const result = await controller.create(createCallDto, mockUser);

      expect(result).toEqual(mockCall);
      expect(service.create).toHaveBeenCalledWith(createCallDto, mockUser);
    });
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return paginated calls', async () => {
      const mockPaginatedResult = {
        data: [mockCall],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findMyCalls', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return user calls', async () => {
      const mockPaginatedResult = {
        data: [mockCall],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findByUser.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findMyCalls(mockUser, mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findByUser).toHaveBeenCalledWith('user-123', mockQuery);
    });
  });

  describe('findByUser', () => {
    const userId = 'user-456';
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return calls by user ID', async () => {
      const mockPaginatedResult = {
        data: [mockCall],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findByUser.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findByUser(userId, mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findByUser).toHaveBeenCalledWith(userId, mockQuery);
    });
  });

  describe('findOne', () => {
    const callId = 'call-123';

    it('should return a call by ID', async () => {
      service.findOne.mockResolvedValue(mockCall);

      const result = await controller.findOne(callId);

      expect(result).toEqual(mockCall);
      expect(service.findOne).toHaveBeenCalledWith(callId);
    });
  });

  describe('getTrackingData', () => {
    const callId = 'call-123';

    it('should return tracking data', async () => {
      const trackingData = {
        call: mockCall,
        currentLocation: { latitude: 42.7, longitude: 23.3 },
        route: {
          polyline: 'encoded',
          distance: 5000,
          duration: 600,
          steps: [],
        },
      };
      service.getTrackingData.mockResolvedValue(trackingData);

      const result = await controller.getTrackingData(callId);

      expect(result).toEqual(trackingData);
      expect(service.getTrackingData).toHaveBeenCalledWith(callId);
    });
  });

  describe('getHospitalsForCall', () => {
    const callId = 'call-123';
    const body = { latitude: 42.7, longitude: 23.3 };

    it('should return nearby hospitals', async () => {
      const hospitals = [
        {
          id: 'hosp-1',
          name: 'Hospital 1',
          latitude: 42.7,
          longitude: 23.3,
          distance: 1000,
          duration: 120,
        },
      ];
      service.getHospitalsForCall.mockResolvedValue(hospitals as any);

      const result = await controller.getHospitalsForCall(callId, body);

      expect(result).toEqual(hospitals);
      expect(service.getHospitalsForCall).toHaveBeenCalledWith(
        callId,
        42.7,
        23.3,
      );
    });
  });

  describe('selectHospital', () => {
    const callId = 'call-123';
    const body = {
      hospitalId: 'hosp-1',
      latitude: 42.7,
      longitude: 23.3,
    };

    it('should select hospital for call', async () => {
      const updatedCall = {
        ...mockCall,
        selectedHospitalId: 'hosp-1',
      };
      service.selectHospitalForCall.mockResolvedValue(updatedCall);

      const result = await controller.selectHospital(callId, body);

      expect(result).toEqual(updatedCall);
      expect(service.selectHospitalForCall).toHaveBeenCalledWith(
        callId,
        'hosp-1',
        42.7,
        23.3,
      );
    });
  });

  describe('getHospitalRoute', () => {
    const callId = 'call-123';

    it('should return hospital route data', async () => {
      const routeData = {
        hospital: { id: 'hosp-1', name: 'Hospital 1' },
        route: {
          polyline: 'encoded',
          distance: 3000,
          duration: 300,
          steps: [],
        },
      };
      service.getHospitalRouteData.mockResolvedValue(routeData);

      const result = await controller.getHospitalRoute(callId);

      expect(result).toEqual(routeData);
      expect(service.getHospitalRouteData).toHaveBeenCalledWith(callId);
    });
  });

  describe('dispatchAmbulance', () => {
    const callId = 'call-123';

    it('should dispatch ambulance', async () => {
      const dispatchedCall = {
        ...mockCall,
        status: CallStatus.DISPATCHED,
      };
      service.dispatchNearestAmbulance.mockResolvedValue(dispatchedCall);

      const result = await controller.dispatchAmbulance(callId);

      expect(result).toEqual(dispatchedCall);
      expect(service.dispatchNearestAmbulance).toHaveBeenCalledWith(callId);
    });
  });

  describe('updateAmbulanceLocation', () => {
    const callId = 'call-123';
    const body = { latitude: 42.7, longitude: 23.3 };

    it('should update ambulance location', async () => {
      const updatedCall = {
        ...mockCall,
        ambulanceCurrentLatitude: 42.7,
        ambulanceCurrentLongitude: 23.3,
      };
      service.updateAmbulanceLocation.mockResolvedValue(updatedCall);

      const result = await controller.updateAmbulanceLocation(callId, body);

      expect(result).toEqual(updatedCall);
      expect(service.updateAmbulanceLocation).toHaveBeenCalledWith(
        callId,
        42.7,
        23.3,
      );
    });
  });

  describe('updateStatus', () => {
    const callId = 'call-123';
    const body = { status: CallStatus.COMPLETED };

    it('should update call status', async () => {
      const updatedCall = {
        ...mockCall,
        status: CallStatus.COMPLETED,
      };
      service.updateStatus.mockResolvedValue(updatedCall);

      const result = await controller.updateStatus(callId, body);

      expect(result).toEqual(updatedCall);
      expect(service.updateStatus).toHaveBeenCalledWith(
        callId,
        CallStatus.COMPLETED,
      );
    });
  });

  describe('update', () => {
    const callId = 'call-123';
    const updateCallDto: UpdateCallDto = {
      description: 'Updated description',
    };

    it('should update a call', async () => {
      const updatedCall = {
        ...mockCall,
        description: 'Updated description',
      };
      service.update.mockResolvedValue(updatedCall);

      const result = await controller.update(callId, updateCallDto);

      expect(result).toEqual(updatedCall);
      expect(service.update).toHaveBeenCalledWith(callId, updateCallDto);
    });
  });

  describe('remove', () => {
    const callId = 'call-123';

    it('should delete a call', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(callId);

      expect(result).toEqual({ message: 'Call deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(callId);
    });
  });
});
