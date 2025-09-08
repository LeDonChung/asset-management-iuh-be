# QR Check-in Application

A modern QR code-based attendance system built with NestJS, Prisma, and PostgreSQL.

## 🚀 Features

- **Authentication System**
  - JWT-based authentication
  - Role-based access control (SUPER_ADMIN, ADMIN, STAFF)
  - Secure password hashing with bcrypt
  - User registration and login

- **Database Schema**
  - Users with role management
  - Events management
  - Attendees with QR codes
  - Check-in logging system
  - Soft delete support

- **Security**
  - Global exception handling
  - Input validation with class-validator
  - CORS enabled
  - Environment-based configuration

## 🛠️ Tech Stack

- **Backend**: NestJS (Node.js framework)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qr-checkin-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment setup**
   
   Update `.env` with your database and JWT configuration:
   ```env
   DATABASE_URL="postgres://username:password@localhost:5432/QrCheckIn"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   FRONTEND_URL="http://localhost:3001"
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run database migrations
   pnpm prisma migrate dev
   ```

## 🏃‍♂️ Running the Application

### Development
```bash
pnpm run start:dev
```

### Production
```bash
pnpm run build
pnpm run start:prod
```

The application will be available at `http://localhost:3000`

## Email Configuration

The system automatically sends welcome emails to attendees upon registration. To enable email functionality:

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure SMTP settings in `.env`:**
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM_NAME="QR Check-in System"
   SMTP_FROM_EMAIL="noreply@example.com"
   ```

3. **For Gmail Setup:**
   - Enable 2-Factor Authentication
   - Generate an App Password
   - Use the App Password as `SMTP_PASS`

4. **Email Features:**
   - 🎉 **Welcome Email**: Sent automatically when attendee registers
   - 📱 **QR Code Included**: Interactive QR code in email
   - 🔗 **Web QR Link**: Clickable link to view QR code online
   - ⏰ **Event Reminders**: Template ready for reminder emails
   - 📧 **Professional Templates**: Beautiful HTML email templates

## 🔒 Security Features

- **Password Security**: bcrypt hashing with salt rounds
- **JWT Tokens**: 24-hour expiration
- **Input Validation**: Automatic validation on all endpoints
- **CORS**: Configurable cross-origin requests
- **Global Exception Handling**: Security-minded error responses

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
