import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contact.controller';
import { ContactsService } from './contact.service';
import { Contact } from './entities/contact.entity';
import type { AuthenticatedUser } from '../common/types/auth.types';
import { PaginateQuery } from 'nestjs-paginate';

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: jest.Mocked<ContactsService>;

  const mockContact: Contact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    phoneNumber: '+359881234567',
    email: 'john@example.com',
    user: {} as any,
  };

  const mockUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    role: 'user' as any,
  };

  const mockContactsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUserContacts: jest.fn(),
    getUserContactsList: jest.fn(),
    createContactForUser: jest.fn(),
    updateUserContact: jest.fn(),
    removeUserContact: jest.fn(),
    getUserContact: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        {
          provide: ContactsService,
          useValue: mockContactsService,
        },
      ],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
    service = module.get(ContactsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyContacts', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return current user contacts', async () => {
      const mockPaginatedResult = {
        data: [mockContact],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.getUserContacts.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.getMyContacts(mockUser, mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.getUserContacts).toHaveBeenCalledWith(
        mockUser.id,
        mockQuery,
      );
    });
  });

  describe('createMyContact', () => {
    const createContactDto = {
      name: 'John Doe',
      phoneNumber: '+359881234567',
      email: 'john@example.com',
    };

    it('should create a contact for current user', async () => {
      service.createContactForUser.mockResolvedValue(mockContact);

      const result = await controller.createMyContact(
        mockUser,
        createContactDto,
      );

      expect(result).toEqual(mockContact);
      expect(service.createContactForUser).toHaveBeenCalledWith(
        mockUser.id,
        createContactDto,
      );
    });
  });

  describe('getMyContact', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return current user contact by id', async () => {
      service.getUserContact.mockResolvedValue(mockContact);

      const result = await controller.getMyContact(mockUser, contactId);

      expect(result).toEqual(mockContact);
      expect(service.getUserContact).toHaveBeenCalledWith(
        mockUser.id,
        contactId,
      );
    });
  });

  describe('updateMyContact', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';
    const updateContactDto = {
      name: 'Jane Doe',
      phoneNumber: '+359887654321',
    };

    it('should update current user contact', async () => {
      const updatedContact = { ...mockContact, ...updateContactDto };
      service.updateUserContact.mockResolvedValue(updatedContact);

      const result = await controller.updateMyContact(
        mockUser,
        contactId,
        updateContactDto,
      );

      expect(result).toEqual(updatedContact);
      expect(service.updateUserContact).toHaveBeenCalledWith(
        mockUser.id,
        contactId,
        updateContactDto,
      );
    });
  });

  describe('removeMyContact', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete current user contact', async () => {
      service.removeUserContact.mockResolvedValue(undefined);

      const result = await controller.removeMyContact(mockUser, contactId);

      expect(result).toEqual({ message: 'Contact deleted successfully' });
      expect(service.removeUserContact).toHaveBeenCalledWith(
        mockUser.id,
        contactId,
      );
    });
  });

  describe('findAll (Admin)', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return all contacts (admin only)', async () => {
      const mockPaginatedResult = {
        data: [mockContact],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findOne (Admin)', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a contact by id (admin only)', async () => {
      service.findOne.mockResolvedValue(mockContact);

      const result = await controller.findOne(contactId);

      expect(result).toEqual(mockContact);
      expect(service.findOne).toHaveBeenCalledWith(contactId);
    });
  });

  describe('update (Admin)', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';
    const updateContactDto = {
      name: 'Jane Doe',
      phoneNumber: '+359887654321',
    };

    it('should update a contact (admin only)', async () => {
      const updatedContact = { ...mockContact, ...updateContactDto };
      service.update.mockResolvedValue(updatedContact);

      const result = await controller.update(contactId, updateContactDto);

      expect(result).toEqual(updatedContact);
      expect(service.update).toHaveBeenCalledWith(contactId, updateContactDto);
    });
  });

  describe('remove (Admin)', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a contact (admin only)', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(contactId);

      expect(result).toEqual({
        message: `Contact ${contactId} deleted successfully.`,
      });
      expect(service.remove).toHaveBeenCalledWith(contactId);
    });
  });
});
