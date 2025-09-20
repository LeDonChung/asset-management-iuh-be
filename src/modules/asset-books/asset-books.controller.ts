import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { AssetBooksService } from './asset-books.service';
import { CreateAssetBookDto } from './dto/create-asset-book.dto';
import { AssetBook } from 'src/entities/asset-book.entity';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AssetBookResponseDto } from './dto/asset-book-response.dto';
import { AssetType } from 'src/common/shared/AssetType';

@Controller('asset-books')
export class AssetBooksController {
  constructor(private readonly assetBooksService: AssetBooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, type: AssetBookResponseDto })
  @ApiBody({ type: CreateAssetBookDto })
  async create(@Body() createAssetBookDto: CreateAssetBookDto): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.create(createAssetBookDto);
  }

  @Post('unit/:unitId')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, type: AssetBookResponseDto })
  async createFromUnitId(@Param('unitId') unitId: string): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.createFromUnitId(unitId);
  }

  @Get('unit/:unitId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [AssetBookResponseDto] })
  async findAllByUnitId(@Param('unitId') unitId: string): Promise<AssetBookResponseDto[]> {
    return await this.assetBooksService.findAllByUnitId(unitId);
  }

  @Get('unit/:unitId/year/:year')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOneByUnitIdAndYear(@Param('unitId') unitId: string, @Param('year') year: number): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOneByUnitIdAndYear(unitId, year);
  }

  @Get('unit/:unitId/current')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOneByUnitIdAndCurrentYear(@Param('unitId') unitId: string): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOneByUnitIdAndCurrentYear(unitId);
  }

  @Get('unit/:unitId/room/:roomId')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'assetType', type: String, required: false })
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOneByUnitIdAndRoomId(@Param('unitId') unitId: string, @Param('roomId') roomId: string, @Query('assetType') assetType?: AssetType): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOneByUnitIdAndRoomId(unitId, roomId, assetType);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOne(@Param('id') id: string): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOne(id);
  }
}
