# EmergencyNow Backend

EmergencyNow is a real-time emergency-response platform that coordinates patients, dispatchers, ambulance drivers and hospitals through structured data exchange instead of voice calls. The backend ingests a caller's GPS coordinates, routes the incident to a human dispatcher who picks the right ambulance, streams live route and arrival data to all parties, and exposes the patient's digital medical profile to the responding team. It also fans out automated alerts to the patient's pre-registered emergency contacts so they know an ambulance has been dispatched.

The service is a NestJS / TypeORM / PostgreSQL application with a Redis cache, WebSocket gateways for real-time updates, Google Maps for routing, and Firebase Cloud Messaging for push notifications to drivers whose app is closed.

## Api Documentation

https://emergencynow.samuil.me/api/docs

## Prerequisites

- Node.js 20+
- npm
- Docker + Docker Compose (for the local Postgres and Redis instances)
- A Google Maps Platform API key with the **Routes** and **Places** APIs enabled
- A Firebase project (the same one the Android app uses) with a generated service-account JSON
- A Twilio account (for SMS to emergency contacts) and SMTP credentials (for email)

## Setup

1. **Clone and install:**

   ```
   git clone https://github.com/Samuuil/EmergencyNow-backend.git
   cd EmergencyNow-backend
   npm install
   ```

2. **Create a `.env` file** at the project root (see the full list below).

3. **Start Postgres and Redis** via Docker Compose:

   ```
   docker compose up -d
   ```

4. **Run migrations** to create the database schema:

   ```
   npm run migration:run
   ```

5. **Seed baseline data** (admin/dispatcher/driver users, hospitals, sample ambulances):

   ```
   npm run seed
   ```

6. **Start the server in watch mode:**
   ```
   npm run start:dev
   ```

The API listens on `http://localhost:3000` by default.

## Environment variables

Put these in a `.env` file at the repo root.

### Database

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=db_user
DATABASE_PASSWORD=db_password
DATABASE_NAME=emergencynow
```

### Redis

```
REDIS_URL=redis://127.0.0.1:6381
```

### Server

```
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
```

### Auth (JWT)

```
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<a different long random string>
```

### Google Maps

```
GOOGLE_MAPS_API_KEY=<your Google Maps Platform key>
```

### Firebase Cloud Messaging

Generate a service-account key from **Firebase Console → Project settings → Service accounts → Generate new private key**, then copy three fields from the downloaded JSON:

```
FIREBASE_PROJECT_ID=<from JSON: project_id>
FIREBASE_CLIENT_EMAIL=<from JSON: client_email>
FIREBASE_PRIVATE_KEY="<from JSON: private_key, keep the literal \n escapes, wrap in double quotes>"
```

If these three are missing the server still runs but push notifications are disabled (logged on startup).

### Twilio (SMS to emergency contacts)

```
ACCOUNT_SID=<Twilio Account SID>
AUTH_TOKEN=<Twilio Auth Token>
TWILIO_PHONE_NUMBER=<your Twilio sending number, E.164 format>
```

### Mail (SMTP — for emails to emergency contacts and verification codes)

```
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=<smtp user>
MAIL_PASSWORD=<smtp password>
MAIL_FROM="EmergencyNow <no-reply@example.com>"
```

### External integrations

```
STATE_ARCHIVE_URL=<URL of the state archive service used to resolve EGN data>
```

### Seeding (optional)

```
SEED_USER=<email of the admin user the seed script creates>
```

## Useful scripts

| Command                   | What it does                      |
| ------------------------- | --------------------------------- |
| `npm run start:dev`       | Start the API in watch mode       |
| `npm run build`           | Compile to `dist/`                |
| `npm run start:prod`      | Run the compiled build            |
| `npm run migration:run`   | Apply pending migrations          |
| `npm run migration:revert`| Revert the last applied migration |
| `npm run seed`            | Seed the database                 |
