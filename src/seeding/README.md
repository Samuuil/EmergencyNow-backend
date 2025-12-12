# Database Seeding

This directory contains the seeding functionality for the EmergencyNow backend application.

## Overview

The seeding system creates initial data for:
- **State Archive entries**: 3 predefined entries with EGNs, names, emails, and phone numbers
- **Users**: 3 users with different roles (USER, DRIVER, ADMIN) linked to the state archive entries

## Seed Data

### State Archive Entries
1. **Boris Borisov** - EGN: 1111111111, Email: SEED_USER1_EMAIL, Phone: SEED_USER1_PHONE
2. **Stanislav Trifonov** - EGN: 2222222222, Email: SEED_USER2_EMAIL, Phone: SEED_USER2_PHONE  
3. **Preslav Ivanov** - EGN: 3333333333, Email: SEED_USER3_EMAIL, Phone: SEED_USER3_PHONE

### Users
1. **Boris Borisov** - Role: USER (regular user)
2. **Stanislav Trifonov** - Role: DRIVER 
3. **Preslav Ivanov** - Role: ADMIN

## Environment Variables

The seeding uses environment variables for email and phone data. If not set, default values are used:
- `SEED_USER1_EMAIL` (default: boris.borisov@example.com)
- `SEED_USER1_PHONE` (default: +359888111111)
- `SEED_USER2_EMAIL` (default: stanislav.trifonov@example.com)
- `SEED_USER2_PHONE` (default: +359888222222)
- `SEED_USER3_EMAIL` (default: preslav.ivanov@example.com)
- `SEED_USER3_PHONE` (default: +359888333333)

## Usage

### Run all seeders
```bash
npm run seed
```

### Clear all seed data
```bash
npm run seed:clear
```

### Reset (clear and re-seed)
```bash
npm run seed:reset
```

## Notes

- The seeding is idempotent - running it multiple times won't create duplicates
- State archive entries are created first, then users are linked to them
- The clear operation removes users first, then state archive entries
- All operations include proper error handling and logging
