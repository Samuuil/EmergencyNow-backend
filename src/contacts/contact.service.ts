import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/createContact.dto';
import { UpdateContactDto } from './dto/updateContact.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ContactsService {
  private readonly MAX_CONTACTS = 5;

  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactsRepository.create(dto);
    return await this.contactsRepository.save(contact);
  }

  async findAll(): Promise<Contact[]> {
    return await this.contactsRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found!`);
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, dto);
    return await this.contactsRepository.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactsRepository.remove(contact);
  }

  async getUserContacts(userId: string): Promise<Contact[]> {
    const contacts = await this.contactsRepository.find({
      where: { user: { id: userId } },
    });

    return contacts;
  }

  async createContactForUser(userId: string, dto: CreateContactDto): Promise<Contact> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['contacts'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const currentContactCount = user.contacts?.length || 0;
    if (currentContactCount >= this.MAX_CONTACTS) {
      throw new BadRequestException(`Maximum of ${this.MAX_CONTACTS} contacts allowed`);
    }

    const contact = this.contactsRepository.create({
      ...dto,
      user,
    });

    const savedContact = await this.contactsRepository.save(contact);
    
    const { user: _, ...contactWithoutUser } = savedContact;
    return contactWithoutUser as Contact;
  }

  async updateUserContact(userId: string, contactId: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId },
      relations: ['user'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    if (contact.user.id !== userId) {
      throw new BadRequestException('You can only update your own contacts');
    }

    Object.assign(contact, dto);
    const updatedContact = await this.contactsRepository.save(contact);
    
    const { user: _, ...contactWithoutUser } = updatedContact;
    return contactWithoutUser as Contact;
  }

  async removeUserContact(userId: string, contactId: string): Promise<void> {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId },
      relations: ['user'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    if (contact.user.id !== userId) {
      throw new BadRequestException('You can only delete your own contacts');
    }

    await this.contactsRepository.remove(contact);
  }

  async getUserContact(userId: string, contactId: string): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId },
      relations: ['user'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    if (contact.user.id !== userId) {
      throw new BadRequestException('You can only view your own contacts');
    }

    const { user: _, ...contactWithoutUser } = contact;
    return contactWithoutUser as Contact;
  }
}
