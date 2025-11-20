import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  HttpStatus,
  HttpCode,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AssetBooksService } from './asset-books.service';
import { CreateAssetBookDto } from './dto/create-asset-book.dto';
import { ApiBody, ApiQuery, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssetBookResponseDto } from './dto/asset-book-response.dto';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetBookFilterDto } from './dto/asset-book-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { AssetResponseDto } from '../assets/dto/asset-response.dto';
import { LiquidationProposedFilterDto } from './dto/liquidation-proposed-filter.dto';
import { LiquidationProposedInventoryResultDto } from './dto/liquidation-proposed-inventory-result.dto';
import { CreateAssetBookFromInventoryDto } from './dto/create-asset-book-from-inventory.dto';

@ApiTags('Asset Books')
@ApiBearerAuth()
@Controller('api/v1/asset-books')
export class AssetBooksController {
  constructor(private readonly assetBooksService: AssetBooksService) {}

  @Post('filter')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách tài sản trong sổ với bộ lọc',
    type: PaginatedResponseDto<AssetBookResponseDto>
  })
  @ApiBody({ type: AssetBookFilterDto })
  async findWithRoleBasedFilter(
    @Body() filterDto: AssetBookFilterDto
  ): Promise<PaginatedResponseDto<AssetBookResponseDto>> {
    return await this.assetBooksService.findAssetBooksWithRoleBasedFilter(filterDto);
  }

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

  @Post('create-from-inventory')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ 
    status: 201, 
    description: 'Tạo sổ tài sản từ kết quả kiểm kê của đơn vị phân công',
    type: AssetBookResponseDto 
  })
  @ApiBody({ type: CreateAssetBookFromInventoryDto })
  async createFromInventoryResults(
    @Body() createDto: CreateAssetBookFromInventoryDto,
    @CurrentUser() currentUser: User
  ): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.createAssetBookFromInventoryResults(createDto, currentUser);
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

  @Post('assets/filter')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách tài sản từ sổ tài sản với bộ lọc',
    type: PaginatedResponseDto<AssetResponseDto>
  })
  @ApiBody({ type: AssetBookFilterDto })
  async getAssetsFromAssetBooks(
    @Body() filterDto: AssetBookFilterDto
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    return await this.assetBooksService.getAssetsFromAssetBooks(filterDto);
  }

  @Post('liquidation-proposed/filter')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách tài sản được đề xuất thanh lý từ kết quả kiểm kê',
    type: PaginatedResponseDto<LiquidationProposedInventoryResultDto>
  })
  @ApiBody({ type: LiquidationProposedFilterDto })
  async findLiquidationProposedAssets(
    @Body() filterDto: LiquidationProposedFilterDto,
    @CurrentUser() currentUser: User
  ): Promise<PaginatedResponseDto<LiquidationProposedInventoryResultDto>> {
    return await this.assetBooksService.findLiquidationProposedAssets(filterDto, currentUser);
  }

  @Get('export/excel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'type', enum: AssetType, required: true, description: 'Loại tài sản' })
  @ApiQuery({ name: 'unitId', type: String, required: true, description: 'ID đơn vị' })
  @ApiQuery({ name: 'year', type: Number, required: true, description: 'Năm' })
  @ApiResponse({ 
    status: 200, 
    description: 'Xuất sổ tài sản ra file Excel',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  async exportToExcel(
    @Query('type') type: AssetType,
    @Query('unitId') unitId: string,
    @Query('year') year: number,
    @Res() res: Response,
    @CurrentUser() currentUser: User
  ): Promise<void> {
    const buffer = await this.assetBooksService.exportAssetBookToExcel_FirstPageOnly(type, unitId, year, currentUser);
    
    const filename = `So_Tai_San_${type}_${unitId}_${year}.xlsx`;
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    
    res.end(buffer);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOne(@Param('id') id: string): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOne(id);
  }
}
