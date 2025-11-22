import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, MinLength, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CopyInventoryDto {
  @IsString()
  @MinLength(1, { message: 'Tên kỳ kiểm kê không được để trống' })
  name: string;

  @IsNumber({}, { message: 'Năm phải là số' })
  @Min(2020, { message: 'Năm phải từ 2020 trở lên' })
  @Max(2050, { message: 'Năm không được vượt quá 2050' })
  year: number;

  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate: string;

  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Copy options
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  copyMembers?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  copyGroups?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  copyAssignments?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  copyFileUrls?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  copySubInventories?: boolean = true; // Mặc định copy tiểu ban
}
