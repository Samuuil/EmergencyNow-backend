import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ContactErrorCode, ContactErrorMessages } from './errors/contact-errors.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/createContact.dto';
import { UpdateContactDto } from './dto/updateContact.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private readonly MAX_CONTACTS = 5;

  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    try {
      const contact = this.contactsRepository.create(dto);
      return await this.contactsRepository.save(contact);
    } catch (error) {
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_CREATION_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED],
      });
    }
  }

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.contactsRepository, {
        sortableColumns: ['name', 'phoneNumber', 'createdAt'],
        defaultSortBy: [['createdAt', 'DESC']],
        searchableColumns: ['name', 'phoneNumber'],
        filterableColumns: {
          name: [FilterOperator.ILIKE],
          phoneNumber: [FilterOperator.ILIKE],
        },
        relations: ['user'],
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<Contact> {
    try {
      const contact = await this.contactsRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!contact) {
        throw new NotFoundException({
          code: ContactErrorCode.CONTACT_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.CONTACT_NOT_FOUND],
        });
      }

      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    try {
      const contact = await this.findOne(id);
      Object.assign(contact, dto);
      return await this.contactsRepository.save(contact);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_UPDATE_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const contact = await this.findOne(id);
      await this.contactsRepository.remove(contact);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_DELETE_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED],
      });
    }
  }

  async getUserContacts(userId: string, query: PaginateQuery) {
    try {
      return paginate(query, this.contactsRepository, {
        sortableColumns: ['name', 'phoneNumber', 'createdAt'],
        defaultSortBy: [['createdAt', 'DESC']],
        searchableColumns: ['name', 'phoneNumber'],
        filterableColumns: {
          name: [FilterOperator.ILIKE],
          phoneNumber: [FilterOperator.ILIKE],
        },
        where: { user: { id: userId } },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }

  async getUserContactsList(userId: string): Promise<Contact[]> {
    try {
      const contacts = await this.contactsRepository.find({
        where: { user: { id: userId } },
      });
      return contacts;
    } catch (error) {
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }

  async createContactForUser(userId: string, dto: CreateContactDto): Promise<Contact> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['contacts'],
      });

      if (!user) {
        throw new NotFoundException({
          code: ContactErrorCode.USER_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.USER_NOT_FOUND],
        });
      }

      const currentContactCount = user.contacts?.length || 0;
      if (currentContactCount >= this.MAX_CONTACTS) {
        throw new BadRequestException({
          code: ContactErrorCode.MAX_CONTACTS_REACHED,
          message: ContactErrorMessages[ContactErrorCode.MAX_CONTACTS_REACHED],
        });
      }

      const contact = this.contactsRepository.create({
        ...dto,
        user,
      });

      const savedContact = await this.contactsRepository.save(contact);
      
      const { user: _, ...contactWithoutUser } = savedContact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_CREATION_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED],
      });
    }
  }

  async updateUserContact(userId: string, contactId: string, dto: UpdateContactDto): Promise<Contact> {
    try {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId },
        relations: ['user'],
      });

      if (!contact) {
        throw new NotFoundException({
          code: ContactErrorCode.CONTACT_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.CONTACT_NOT_FOUND],
        });
      }

      if (contact.user.id !== userId) {
        throw new BadRequestException({
          code: ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS,
          message: ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      Object.assign(contact, dto);
      const updatedContact = await this.contactsRepository.save(contact);
      
      const { user: _, ...contactWithoutUser } = updatedContact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_UPDATE_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED],
      });
    }
  }

  async removeUserContact(userId: string, contactId: string): Promise<void> {
    try {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId },
        relations: ['user'],
      });

      if (!contact) {
        throw new NotFoundException({
          code: ContactErrorCode.CONTACT_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.CONTACT_NOT_FOUND],
        });
      }

      if (contact.user.id !== userId) {
        throw new BadRequestException({
          code: ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS,
          message: ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      await this.contactsRepository.remove(contact);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_DELETE_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED],
      });
    }
  }

  async getUserContact(userId: string, contactId: string): Promise<Contact> {
    try {
      const contact = await this.contactsRepository.findOne({
        where: { id: contactId },
        relations: ['user'],
      });

      if (!contact) {
        throw new NotFoundException({
          code: ContactErrorCode.CONTACT_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.CONTACT_NOT_FOUND],
        });
      }

      if (contact.user.id !== userId) {
        throw new BadRequestException({
          code: ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS,
          message: ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      const { user: _, ...contactWithoutUser } = contact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }
}
