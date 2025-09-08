---
applyTo: "**/*"
---

# QR CheckIn System — Backend Instructions (NestJS + Prisma + PostgreSQL)

## Language policy
- Use **English** for code, comments, API docs, error codes/messages.
- End-user templates (emails, public content) may be **Vietnamese**.

## Stack & modules
- **NestJS 11**, **TypeScript**, **Prisma 6** (PostgreSQL), **JWT (passport-jwt)**, **class-validator/transformer**, **Swagger**, **Socket.IO**, **Helmet**, **Throttler**.
- Import/Export: `csv-parser`, `xlsx`, `exceljs`. Email: `nodemailer` + `handlebars`. Upload: `multer`.

## Architecture & conventions
- Modules under `src/modules/*`: `events`, `attendees`, `checkins`, `auth`, `users`, `roles`, `emails`, `uploads`.
- Controllers are thin → Services contain business logic → Prisma is accessed via repositories.
- DTOs are class-based with decorators. Global validation:
  - `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

## App setup
- Base path `/api`. Enable CORS for FE origin, `helmet()`, and throttling (e.g., `100 req / 60s`).
- Standard error body: `{ code: string; message: string; details?: any }` (**do not** add `statusCode` in payload; use HTTP status).
- Swagger with bearer auth and documented error codes.

## Auth & authorization
- Local login → JWT (HS256). Passwords hashed via **bcryptjs** (`saltRounds >= 10`).
- Roles: `SUPER_ADMIN`, `ADMIN`, `STAFF`. Combine `AuthGuard('jwt')` + `RolesGuard`.

## Domain
- **Events**: `id`, `uuid`, `name`, `startAt`, `endAt`, `status` (active/closed), `settings` (e.g., `doubleCheckinCooldownSeconds`).
- **Attendees**: `id`, `uuid`, `eventId`, `name`, `email`, `phone`, `ticketCode`, `status`.
- **CheckIns**:
  - `id`, `eventId`, `attendeeId`, `checkedInAt`, `checkedInBy` (userId/device).
  - `POST /check-ins` must be **idempotent** within a cooldown window to prevent double tap.
  - After persisting, emit Socket.IO event `checkin:created` (payload: ids + timestamps).

## Prisma & database
- Relations: events (1) → attendees (n) → checkins (n). Indexes on `eventId`, `attendeeId`, `checkedInAt`.
- Use `$transaction` for multi-step check-in flows and counters.
- Migrations: timestamped naming; review before deploy.

## Import/Export
- Import attendees from CSV/XLSX:
  - Validate schema, upsert by `ticketCode` or `email` within an event.
  - Optional small queue/batch handling for large files.
- Export XLSX via `exceljs`; stream response.

## Emails & templates
- `nodemailer` SMTP; templates in `templates/*.hbs`.
- Common variables: `{{eventName}}`, `{{attendeeName}}`, `{{qrUrl}}`.

## Uploads
- `multer` for local storage (pluggable for cloud later). Validate file size/type. Never trust filename.

## Realtime
- `@nestjs/websockets` + `socket.io` on namespace `/ws`. JWT auth via header or query.
- Emit `checkin:created` after successful check-in.

## Security & hardening
- Never log tokens/passwords. Exclude sensitive fields from DTOs.
- Strict validation on all inputs. Apply rate limiting on `/auth/login`, `/check-ins`.
- Set sensible file upload limits; validate mimetypes.

## Testing
- Unit tests with `jest` for services/controllers.
- E2E with `supertest` (`test/jest-e2e.json`): boot test app + test DB.
- Cover cases: first-time check-in, repeated within cooldown, event inactive.

## Environment
- `.env` keys (examples):
  - `DATABASE_URL=postgresql://user:pass@host:5432/db`
  - `JWT_SECRET=...`
  - `JWT_EXPIRES=1d`
  - `SMTP_HOST=...`, `SMTP_PORT=...`, `SMTP_USER=...`, `SMTP_PASS=...`
  - `APP_BASE_URL=https://api.example.com`
  - `SOCKET_ORIGIN=https://fe.example.com`
- NPM scripts used:
  - dev: `start:dev`; build: `build`; tests: `test`, `test:e2e`; seed: `prisma:seed`.

## Response & error codes
- Success returns **DTOs**, not raw Prisma entities.
- Error `code` catalog (align with FE):
  - `ATTENDEE_NOT_FOUND`, `EVENT_INACTIVE`, `ALREADY_CHECKED_IN`,
  - `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `VALIDATION_FAILED`, `IMPORT_FAILED`.

## What to generate (for Copilot)
- Controllers with DTO validation + Swagger decorators.
- Services with business logic and Prisma repository usage (no direct Prisma calls in controllers).
- Check-in flow with **idempotency window** + Socket.IO emit + structured DTO result.
- Unit tests for services and minimal E2E for critical endpoints.
- When adding endpoints: update roles/guards, Swagger docs, and error code coverage.

## Coding rules for Copilot (project-specific)
- Use eslint/prettier, follow the project's code style. Avoid `any` and unnecessary `eslint-disable`.
- Folder structure: controllers, services, dto, modules, repositories (if any), and tests must be in their respective folders under `src/`.
- No business logic in controllers; only call service methods.
- All endpoints must have Swagger decorators: `@ApiOperation`, `@ApiResponse`, and document error codes.
- Always throw `HttpException` with standard `code` and `message` (never return raw errors).
- All input must use DTOs with `class-validator` decorators. Never accept free-form objects from FE.
- Never call Prisma directly in controllers; always use service/repository layer.
- For check-in, always emit the correct Socket.IO event and payload after success.
- Import: strictly validate file schema, reject if invalid.
- Never hardcode config; always use `process.env` or config service.
- All services must have unit tests; controllers must have e2e tests for main flows. Avoid over-mocking Prisma, prefer real logic testing.