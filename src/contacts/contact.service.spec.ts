import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contact.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { User } from '../users/entities/user.entity';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate');

describe('ContactsService', () => {
  let service: ContactsService;
  let contactsRepository: jest.Mocked<Repository<Contact>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockContact: Contact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    phoneNumber: '+359881234567',
    email: 'john@example.com',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174001',
    } as User,
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    contacts: [mockContact],
  } as User;

  const mockContactsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getRepositoryToken(Contact),
          useValue: mockContactsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    contactsRepository = module.get(getRepositoryToken(Contact));
    userRepository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockQuery = {
      path: '',
    };

    it('should return paginated contacts', async () => {
      const mockPaginatedResult = {
        data: [mockContact],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginate).toHaveBeenCalledWith(mockQuery, contactsRepository, {
        sortableColumns: ['id', 'name', 'phoneNumber', 'email'],
        defaultSortBy: [['name', 'ASC']],
        searchableColumns: ['name', 'phoneNumber', 'email'],
        filterableColumns: expect.any(Object),
        relations: ['user'],
        defaultLimit: 10,
        maxLimit: 100,
      });
    });

    it('should throw InternalServerErrorException on paginate error', async () => {
      (paginate as jest.Mock).mockImplementation(() => {
        throw new Error('Pagination error');
      });

      await expect(service.findAll(mockQuery)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a contact by id', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);

      const result = await service.findOne(contactId);

      expect(result).toEqual(mockContact);
      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(contactId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      contactsRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(contactId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';
    const updateContactDto = {
      name: 'Jane Doe',
      phoneNumber: '+359887654321',
    };

    it('should update a contact successfully', async () => {
      const updatedContact = { ...mockContact, ...updateContactDto };
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.save.mockResolvedValue(updatedContact);

      const result = await service.update(contactId, updateContactDto);

      expect(result).toEqual(updatedContact);
      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
      expect(contactsRepository.save).toHaveBeenCalledWith(updatedContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(service.update(contactId, updateContactDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on update error', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.save.mockRejectedValue(new Error('Update error'));

      await expect(service.update(contactId, updateContactDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove a contact successfully', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.remove.mockResolvedValue(mockContact);

      await service.remove(contactId);

      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
      expect(contactsRepository.remove).toHaveBeenCalledWith(mockContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(contactId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.remove.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(contactId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserContacts', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const mockQuery = {
      path: '',
    };

    it('should return user contacts paginated', async () => {
      const mockPaginatedResult = {
        data: [mockContact],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.getUserContacts(userId, mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginate).toHaveBeenCalledWith(
        mockQuery,
        contactsRepository,
        expect.objectContaining({
          where: { user: { id: userId } },
        }),
      );
    });

    it('should throw InternalServerErrorException on error', async () => {
      (paginate as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getUserContacts(userId, mockQuery)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserContactsList', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';

    it('should return list of user contacts', async () => {
      contactsRepository.find.mockResolvedValue([mockContact]);

      const result = await service.getUserContactsList(userId);

      expect(result).toEqual([mockContact]);
      expect(contactsRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      contactsRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserContactsList(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createContactForUser', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const createContactDto = {
      name: 'John Doe',
      phoneNumber: '+359881234567',
      email: 'john@example.com',
    };

    it('should create a contact for user', async () => {
      const userWithContacts = { ...mockUser, contacts: [] };
      userRepository.findOne.mockResolvedValue(userWithContacts);
      contactsRepository.create.mockReturnValue(mockContact);
      contactsRepository.save.mockResolvedValue(mockContact);

      await service.createContactForUser(userId, createContactDto);

      expect(contactsRepository.create).toHaveBeenCalledWith({
        ...createContactDto,
        user: userWithContacts,
      });
      expect(contactsRepository.save).toHaveBeenCalledWith(mockContact);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createContactForUser(userId, createContactDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when max contacts reached', async () => {
      const userWithMaxContacts = {
        ...mockUser,
        contacts: new Array(5).fill(mockContact),
      };
      userRepository.findOne.mockResolvedValue(userWithMaxContacts);

      await expect(
        service.createContactForUser(userId, createContactDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createContactForUser(userId, createContactDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateUserContact', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const contactId = '123e4567-e89b-12d3-a456-426614174000';
    const updateContactDto = {
      name: 'Jane Doe',
    };

    it('should update user contact', async () => {
      const updatedContact = { ...mockContact, ...updateContactDto };
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.save.mockResolvedValue(updatedContact);

      await service.updateUserContact(userId, contactId, updateContactDto);

      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
      expect(contactsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserContact(userId, contactId, updateContactDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user does not own contact', async () => {
      const contactWithDifferentUser = {
        ...mockContact,
        user: { id: 'different-user-id' } as User,
      };
      contactsRepository.findOne.mockResolvedValue(contactWithDifferentUser);

      await expect(
        service.updateUserContact(userId, contactId, updateContactDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.save.mockRejectedValue(new Error('Update error'));

      await expect(
        service.updateUserContact(userId, contactId, updateContactDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('removeUserContact', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove user contact', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.remove.mockResolvedValue(mockContact);

      await service.removeUserContact(userId, contactId);

      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
      expect(contactsRepository.remove).toHaveBeenCalledWith(mockContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeUserContact(userId, contactId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user does not own contact', async () => {
      const contactWithDifferentUser = {
        ...mockContact,
        user: { id: 'different-user-id' } as User,
      };
      contactsRepository.findOne.mockResolvedValue(contactWithDifferentUser);

      await expect(
        service.removeUserContact(userId, contactId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);
      contactsRepository.remove.mockRejectedValue(new Error('Delete error'));

      await expect(
        service.removeUserContact(userId, contactId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getUserContact', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const contactId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return user contact', async () => {
      contactsRepository.findOne.mockResolvedValue(mockContact);

      const result = await service.getUserContact(userId, contactId);

      expect(contactsRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['user'],
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when contact not found', async () => {
      contactsRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserContact(userId, contactId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user does not own contact', async () => {
      const contactWithDifferentUser = {
        ...mockContact,
        user: { id: 'different-user-id' } as User,
      };
      contactsRepository.findOne.mockResolvedValue(contactWithDifferentUser);

      await expect(service.getUserContact(userId, contactId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on error', async () => {
      contactsRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserContact(userId, contactId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
