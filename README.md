# Asset Management System - Backend

Hệ thống quản lý tài sản được xây dựng với NestJS, TypeORM, và PostgreSQL.

## 🚀 Tính năng chính

- **Hệ thống xác thực và phân quyền**
  - Xác thực JWT với Passport
  - Phân quyền theo vai trò (Role-based Access Control)
  - Mã hóa mật khẩu với bcryptjs
  - Quản lý người dùng và đơn vị

- **Quản lý tài sản**
  - CRUD operations cho tất cả entities
  - Quản lý permissions linh hoạt
  - Soft delete support
  - Audit trail cho các thay đổi

- **Bảo mật**
  - Global exception handling
  - Input validation với class-validator
  - CORS configuration
  - Rate limiting với Throttler
  - Helmet security headers

## 🛠️ Công nghệ sử dụng

- **Backend Framework**: NestJS 11+ (Node.js)
- **Database**: PostgreSQL với TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Package Manager**: pnpm
- **Real-time**: Socket.IO
- **Email**: Nodemailer với Handlebars templates

## 📋 Yêu cầu hệ thống

- **Node.js** v18 hoặc cao hơn
- **PostgreSQL** v12 hoặc cao hơn
- **pnpm** package manager
- **Docker** và **Docker Compose** (tuỳ chọn)

## 🔧 Cài đặt và chạy dự án

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd asset-management-iuh-be
   ```

2. **Sao chép file environment**
   ```bash
   cp .env.example .env
   ```

3. **Cấu hình environment variables trong `.env`**
   ```env
   # Database
   DB_HOST=asset-db
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=asset

   # JWT Secret for authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Application settings
   NODE_ENV=development
   API_URL=http://localhost:3000

   # SMTP Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_NAME=Asset Management System
   SMTP_FROM_EMAIL=noreply@assetmanagement.com
   ```

4. **Khởi động database với Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Cài đặt dependencies**
   ```bash
   pnpm install
   ```

6. **Chạy database migrations**
   ```bash
   pnpm run migration:run
   ```

7. **Khởi động ứng dụng**
   ```bash
   # Development mode
   pnpm run start:dev

   # Production mode
   pnpm run build
   pnpm run start:prod
   ```

## 📊 Database Management

### TypeORM Migrations

```bash
# Tạo migration mới
pnpm run migration:create -- src/migrations/YourMigrationName

# Tạo migration từ entity changes
pnpm run migration:generate -- src/migrations/YourMigrationName

# Chạy migrations
pnpm run migration:run

# Hoàn tác migration cuối cùng
pnpm run migration:revert

# Xem trạng thái migrations
pnpm run migration:show

# Đồng bộ schema (chỉ dùng trong development)
pnpm run schema:sync

# Xóa toàn bộ database schema
pnpm run schema:drop
```

### Docker Database Commands

```bash
# Khởi động database
docker-compose up -d asset-db

# Dừng database
docker-compose stop asset-db

# Xem logs database
docker-compose logs -f asset-db

# Truy cập PostgreSQL shell
docker-compose exec asset-db psql -U postgres -d asset

# Backup database
docker-compose exec asset-db pg_dump -U postgres asset > backup.sql

# Restore database
docker-compose exec -T asset-db psql -U postgres asset < backup.sql

# Xóa database và volume
docker-compose down -v
```

## 🏃‍♂️ Chạy ứng dụng

```bash
# Development mode (hot reload)
pnpm run start:dev

# Debug mode
pnpm run start:debug

# Production mode
pnpm run build
pnpm run start:prod

# Watch mode for tests
pnpm run test:watch
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

API Documentation (Swagger): `http://localhost:3000/api`

## 🔐 Cấu hình Email

Hệ thống hỗ trợ gửi email thông báo và xác thực. Để kích hoạt tính năng email:

1. **Cấu hình SMTP trong `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_NAME=Asset Management System
   SMTP_FROM_EMAIL=noreply@assetmanagement.com
   ```

2. **Cài đặt Gmail App Password:**
   - Bật 2-Factor Authentication
   - Tạo App Password trong cài đặt Gmail
   - Sử dụng App Password làm `SMTP_PASS`

3. **Tính năng Email:**
   - 📧 **Email chào mừng**: Gửi tự động khi tạo tài khoản
   - 🔑 **Reset password**: Email đặt lại mật khẩu
   - 📋 **Thông báo hệ thống**: Template sẵn sàng cho notifications
   - 🎨 **HTML Templates**: Email templates đẹp với Handlebars

## 📁 Cấu trúc dự án

```
src/
├── common/                 # Shared utilities và configurations
│   ├── config/            # Database và app configurations
│   ├── dto/               # Common DTOs (pagination, response)
│   ├── filters/           # Exception filters
│   ├── helpers/           # Helper functions
│   └── utils/             # Utility functions và constants
├── entities/              # TypeORM entities
│   ├── user.entity.ts
│   ├── role.entity.ts
│   ├── permission.entity.ts
│   ├── unit.entity.ts
│   └── manager-permission.entity.ts
├── migrations/            # Database migrations
├── modules/               # Feature modules
│   ├── auth/             # Authentication & authorization
│   ├── users/            # User management
│   ├── roles/            # Role management
│   └── permissions/      # Permission management
├── app.module.ts         # Root application module
└── main.ts              # Application entry point
```

## �️ Tính năng bảo mật

- **Password Security**: Mã hóa bcrypt với salt rounds
- **JWT Tokens**: Expiration time có thể cấu hình
- **Input Validation**: Validation tự động cho tất cả endpoints
- **CORS**: Cấu hình cross-origin requests
- **Rate Limiting**: Throttling requests
- **Helmet**: Security headers
- **Global Exception Handling**: Error responses bảo mật

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov

# Debug tests
pnpm run test:debug
```

## 📖 API Documentation

API documentation được tự động tạo với Swagger và có thể truy cập tại:
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

### Các endpoint chính:

- **Authentication**: `/api/auth`
  - `POST /auth/login` - Đăng nhập
  - `POST /auth/register` - Đăng ký (nếu có)
  - `POST /auth/refresh` - Refresh token

- **Users**: `/api/users`
  - `GET /users` - Lấy danh sách users
  - `POST /users` - Tạo user mới
  - `PUT /users/:id` - Cập nhật user
  - `DELETE /users/:id` - Xóa user

- **Roles**: `/api/roles`
  - CRUD operations cho roles

- **Permissions**: `/api/permissions`
  - CRUD operations cho permissions

## 🚀 Deployment

### Docker Production Deployment

1. **Tạo production docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       depends_on:
         - asset-db
       restart: unless-stopped

     asset-db:
       image: postgres:15-alpine
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: your-secure-password
         POSTGRES_DB: asset
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped

   volumes:
     postgres_data:
   ```

2. **Build và deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Manual Deployment

1. **Build application:**
   ```bash
   pnpm run build
   ```

2. **Setup production environment:**
   ```bash
   export NODE_ENV=production
   export DB_HOST=your-production-db-host
   # ... other environment variables
   ```

3. **Run migrations:**
   ```bash
   pnpm run migration:run
   ```

4. **Start application:**
   ```bash
   pnpm run start:prod
   ```

## 🔧 Troubleshooting

### Các lỗi thường gặp:

1. **Database connection failed**
   ```bash
   # Kiểm tra database có chạy không
   docker-compose ps
   
   # Kiểm tra logs
   docker-compose logs asset-db
   
   # Test connection
   docker-compose exec asset-db psql -U postgres -d asset -c "SELECT 1;"
   ```

2. **Migration errors**
   ```bash
   # Kiểm tra trạng thái migration
   pnpm run migration:show
   
   # Revert migration nếu cần
   pnpm run migration:revert
   
   # Drop và tạo lại schema (development only)
   pnpm run schema:drop
   pnpm run migration:run
   ```

3. **Port conflicts**
   ```bash
   # Thay đổi port trong docker-compose.yml
   ports:
     - "5433:5432"  # Thay vì 5432:5432
   ```

4. **Permission errors**
   ```bash
   # Chạy với quyền admin nếu cần
   sudo docker-compose up -d
   
   # Hoặc thêm user vào docker group
   sudo usermod -aG docker $USER
   ```

## 📝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 📄 License

Dự án này được phân phối dưới license MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 👥 Team

- **Developer**: Le Don Chung, Tran Thi Thanh Tuyen
- **Organization**: IUH (Industrial University of Ho Chi Minh City)

## 📞 Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng:
1. Kiểm tra [Issues](https://github.com/your-repo/issues) đã có
2. Tạo Issue mới với mô tả chi tiết
3. Liên hệ team phát triển

---

**Happy Coding! 🚀**
