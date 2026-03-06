import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockContext = (user: any): ExecutionContext =>
      ({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as any;

    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({ id: '1', role: Role.USER });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      const context = createMockContext({ id: '1', role: Role.ADMIN });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([
        Role.ADMIN,
        Role.DRIVER,
        Role.DOCTOR,
      ]);

      const context = createMockContext({ id: '1', role: Role.DRIVER });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      const context = createMockContext({ id: '1', role: Role.USER });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user role is not in any of the required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.DOCTOR]);

      const context = createMockContext({ id: '1', role: Role.USER });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should call reflector with correct parameters', () => {
      const context = createMockContext({ id: '1', role: Role.ADMIN });
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
