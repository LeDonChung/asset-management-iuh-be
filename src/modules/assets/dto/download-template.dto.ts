import { ApiProperty } from '@nestjs/swagger';

export class DownloadTemplateDto {
  @ApiProperty({
    description: 'Template type',
    enum: ['excel', 'csv'],
    default: 'excel',
  })
  type?: 'excel' | 'csv';
}
