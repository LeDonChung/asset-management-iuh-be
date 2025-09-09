# Jenkins Deployment Setup Guide

## Yêu cầu Jenkins Credentials

Để sử dụng Jenkinsfile này, bạn cần tạo các credentials sau trong Jenkins:

### 1. Docker Hub Credentials
- **Credential ID**: `docker-credentials`
- **Type**: Username with password
- **Username**: Tên đăng nhập Docker Hub của bạn
- **Password**: Mật khẩu hoặc access token Docker Hub

### 2. Production Server Credentials  
- **Credential ID**: `production-server-credentials`
- **Type**: Username with password
- **Username**: Username để SSH vào máy ảo production
- **Password**: Password để SSH vào máy ảo production

### 3. Environment File
- **Credential ID**: `asset-env-be`
- **Type**: Secret file
- **File**: File `.env` chứa các biến môi trường production

### 4. NodeJS Tool Configuration
- Vào **Manage Jenkins** → **Global Tool Configuration**
- Thêm **NodeJS** installation với tên `NodeJS`
- Chọn phiên bản Node.js 20.x

## Cấu trúc File .env Production

```env
# Database Configuration
DB_HOST=asset-db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-strong-password
DB_NAME=asset

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-32-characters-long
JWT_EXPIRES=1d

# Application Configuration
NODE_ENV=production
APP_PORT=3000
API_URL=http://your-domain.com

# Redis Configuration
REDIS_HOST=asset-redis
REDIS_PORT=6379

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## Cấu hình Server Production

### 1. Cài đặt Docker và Docker Compose trên server
```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply group changes
```

### 2. Tạo thư mục deployment
```bash
mkdir -p /home/username/asset-management
cd /home/username/asset-management
```

### 3. Cấu hình firewall (nếu cần)
```bash
# Mở port 3000 cho ứng dụng
sudo ufw allow 3000

# Mở port 22 cho SSH
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## Cách Deploy Manual (nếu cần)

```bash
# 1. Pull latest image
docker pull ledonchung/asset-management-iuh-be:latest

# 2. Stop existing containers
docker-compose down

# 3. Start new containers
docker-compose -f docker-compose.prod.yml up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f asset-app
```

## Troubleshooting

### 1. Kiểm tra application health
```bash
curl http://localhost:3000/health
```

### 2. Xem logs ứng dụng
```bash
docker-compose logs asset-app
```

### 3. Xem logs database
```bash
docker-compose logs asset-db
```

### 4. Restart services
```bash
docker-compose restart
```

### 5. Cleanup unused images
```bash
docker image prune -f
docker system prune -f
```

## Monitoring

### 1. Kiểm tra resource usage
```bash
docker stats
```

### 2. Kiểm tra disk space
```bash
df -h
docker system df
```

### 3. Kiểm tra logs size
```bash
sudo du -sh /var/lib/docker/containers/*/
```

## Database Backup & Restore

### 1. Backup Database
```bash
# Make backup script executable
chmod +x scripts/backup-db.sh

# Create backup
./scripts/backup-db.sh

# Create backup with custom name
./scripts/backup-db.sh my_backup_name
```

### 2. Restore Database
```bash
# Make restore script executable
chmod +x scripts/restore-db.sh

# Restore from backup
./scripts/restore-db.sh backups/backup_20250909_143000.sql.gz
```

### 3. Automated Backup (Crontab)
```bash
# Add to crontab for daily backup at 2 AM
crontab -e

# Add this line:
0 2 * * * /home/username/asset-management/scripts/backup-db.sh > /dev/null 2>&1
```

## Security Checklist

- [ ] Thay đổi password database mặc định
- [ ] Sử dụng JWT secret mạnh (ít nhất 32 ký tự)
- [ ] Cấu hình firewall chỉ mở các port cần thiết
- [ ] Sử dụng HTTPS trong production
- [ ] Cập nhật thường xuyên Docker images
- [ ] Backup database định kỳ
- [ ] Monitor logs và resource usage

## Support

Nếu gặp vấn đề, hãy kiểm tra:
1. Jenkins build logs
2. Docker container logs
3. Application health endpoint
4. Database connection
5. Network connectivity

Liên hệ: [your-email@domain.com]
