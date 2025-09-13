# Cấu hình Cloudflare R2 cho Upload Files

## 1. Tạo Cloudflare R2 Bucket

1. Đăng nhập vào Cloudflare Dashboard
2. Vào R2 Object Storage
3. Tạo bucket mới
4. Cấu hình public access nếu cần

## 2. Tạo API Token

1. Vào "Manage R2 API tokens"
2. Tạo token mới với quyền:
   - Object:Edit
   - Object:Read
3. Lưu lại Access Key ID và Secret Access Key

## 3. Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.com
```

## 4. Cấu hình Custom Domain (Tùy chọn)

1. Trong R2 bucket settings
2. Thêm custom domain
3. Cấu hình DNS records
4. Sử dụng custom domain trong `CLOUDFLARE_R2_PUBLIC_URL`

## 5. API Endpoints

### Upload Ảnh
- **POST** `/files/upload/image`
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: File ảnh (PNG, JPG, JPEG, max 5MB)
  - `description`: Mô tả (tùy chọn)

### Upload File
- **POST** `/files/upload/document`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: File tài liệu (PDF, Excel, Word, max 10MB)
  - `description`: Mô tả (tùy chọn)

## 6. Response Format

```json
{
  "id": "img-1234567890",
  "url": "https://your-domain.com/images/2024/01/15/image-1234567890.png"
}
```

## 7. Lưu ý

- Files được tổ chức theo thư mục: `images/YYYY/MM/DD/` hoặc `documents/YYYY/MM/DD/`
- Tên file được generate tự động với timestamp
- Không lưu thông tin file vào database
- Chỉ trả về URL public để truy cập file
