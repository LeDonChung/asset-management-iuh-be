import { 
  Controller, 
  Post, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Files')
@Controller('api/v1/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload ảnh',
    description: 'Upload file ảnh (PNG, JPG, JPEG) với kích thước tối đa 5MB'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File ảnh và mô tả (tùy chọn)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh (PNG, JPG, JPEG)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Upload ảnh thành công',
    type: UploadResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc vượt quá kích thước cho phép'
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để upload');
    }
    
    return this.filesService.uploadImage(file);
  }

  @Post('upload/document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload file tài liệu',
    description: 'Upload file tài liệu (PDF, Excel, Word) với kích thước tối đa 10MB'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File tài liệu và mô tả (tùy chọn)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File tài liệu (PDF, Excel .xlsx/.xls, Word .docx/.doc)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Upload file thành công',
    type: UploadResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc vượt quá kích thước cho phép'
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }
    
    return this.filesService.uploadFile(file);
  }

}
