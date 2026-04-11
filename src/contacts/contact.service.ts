import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  ContactErrorCode,
  ContactErrorMessages,
} from './errors/contact-errors.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/createContact.dto';
import { UpdateContactDto } from './dto/updateContact.dto';
import { UsersService } from '../users/user.service';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private readonly MAX_CONTACTS = 5;

  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.contactsRepository, {
        sortableColumns: ['id', 'name', 'phoneNumber', 'email'],
        defaultSortBy: [['name', 'ASC']],
        searchableColumns: ['name', 'phoneNumber', 'email'],
        filterableColumns: {
          name: [FilterOperator.ILIKE],
          phoneNumber: [FilterOperator.ILIKE],
          email: [FilterOperator.ILIKE],
        },
        relations: ['user'],
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error}`,
      );
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
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error}`,
      );
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
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED]}: ${error}`,
      );
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
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_DELETE_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED],
      });
    }
  }

  async getUserContacts(userId: string, query: PaginateQuery) {
    try {
      return paginate(query, this.contactsRepository, {
        sortableColumns: ['id', 'name', 'phoneNumber', 'email'],
        defaultSortBy: [['name', 'ASC']],
        searchableColumns: ['name', 'phoneNumber', 'email'],
        filterableColumns: {
          name: [FilterOperator.ILIKE],
          phoneNumber: [FilterOperator.ILIKE],
          email: [FilterOperator.ILIKE],
        },
        where: { user: { id: userId } },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error}`,
      );
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
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }

  async createContactForUser(
    userId: string,
    dto: CreateContactDto,
  ): Promise<Contact> {
    try {
      const userExists = await this.usersService.exists(userId);
      if (!userExists) {
        throw new NotFoundException({
          code: ContactErrorCode.USER_NOT_FOUND,
          message: ContactErrorMessages[ContactErrorCode.USER_NOT_FOUND],
        });
      }

      const currentContactCount = await this.contactsRepository.count({
        where: { user: { id: userId } },
      });
      if (currentContactCount >= this.MAX_CONTACTS) {
        throw new BadRequestException({
          code: ContactErrorCode.MAX_CONTACTS_REACHED,
          message: ContactErrorMessages[ContactErrorCode.MAX_CONTACTS_REACHED],
        });
      }

      const contact = this.contactsRepository.create({
        ...dto,
        user: { id: userId } as any,
      });

      const savedContact = await this.contactsRepository.save(contact);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user: _user, ...contactWithoutUser } = savedContact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: ContactErrorCode.CONTACT_CREATION_FAILED,
        message: ContactErrorMessages[ContactErrorCode.CONTACT_CREATION_FAILED],
      });
    }
  }

  async updateUserContact(
    userId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
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
          message:
            ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      Object.assign(contact, dto);
      const updatedContact = await this.contactsRepository.save(contact);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user: _user, ...contactWithoutUser } = updatedContact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.CONTACT_UPDATE_FAILED]}: ${error}`,
      );
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
          message:
            ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      await this.contactsRepository.remove(contact);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.CONTACT_DELETE_FAILED]}: ${error}`,
      );
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
          message:
            ContactErrorMessages[ContactErrorCode.UNAUTHORIZED_CONTACT_ACCESS],
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user: _user, ...contactWithoutUser } = contact;
      return contactWithoutUser as Contact;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `${ContactErrorMessages[ContactErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: ContactErrorCode.DATABASE_ERROR,
        message: ContactErrorMessages[ContactErrorCode.DATABASE_ERROR],
      });
    }
  }
}
