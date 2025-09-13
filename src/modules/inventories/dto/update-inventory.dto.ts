import { PartialType } from '@nestjs/swagger';
import { CreateInventoryDto } from './create-inventory.dto';

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {
  // Tất cả các trường từ CreateInventoryDto đều optional trong UpdateInventoryDto
  // do sử dụng PartialType
}
