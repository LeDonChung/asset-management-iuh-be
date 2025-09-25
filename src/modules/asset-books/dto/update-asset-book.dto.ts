import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetBookDto } from './create-asset-book.dto';

export class UpdateAssetBookDto extends PartialType(CreateAssetBookDto) {}
