import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class FilesService {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Validation cho ảnh
  private validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh định dạng PNG, JPG, JPEG');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('Kích thước file ảnh không được vượt quá 5MB');
    }
  }

  // Validation cho file
  private validateDocumentFile(file: Express.Multer.File): void {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file PDF, Excel (.xlsx, .xls), Word (.docx, .doc)');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('Kích thước file không được vượt quá 10MB');
    }
  }

  // Upload ảnh lên Cloudflare R2
  async uploadImage(file: Express.Multer.File): Promise<UploadResponseDto> {
    this.validateImageFile(file);

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `images/${year}/${month}/${day}/image-${Date.now()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME'),
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    // Tạo public URL
    const publicUrl = `${this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL')}/${fileName}`;

    return {
      url: publicUrl,
    };
  }

  // Upload file lên Cloudflare R2
  async uploadFile(file: Express.Multer.File): Promise<UploadResponseDto> {
    this.validateDocumentFile(file);

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `documents/${year}/${month}/${day}/document-${Date.now()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME'),
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    // Tạo public URL
    const publicUrl = `${this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL')}/${fileName}`;

    return {
      url: publicUrl,
    };
  }

}
