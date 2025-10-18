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
} from '@nestjs/common';
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetBookResponseDto })
  async findOne(@Param('id') id: string): Promise<AssetBookResponseDto> {
    return await this.assetBooksService.findOne(id);
  }
}
