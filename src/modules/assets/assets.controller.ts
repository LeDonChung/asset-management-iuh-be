import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from 'express';
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { UpdateRfidDto } from "./dto/update-rfid.dto";
import { AssetResponseDto } from "./dto/asset-response.dto";
import { ImportResultDto } from "./dto/import-asset.dto";
import { ClassifyRfidsDto } from "./dto/classify-rfids.dto";
import { ClassifyRfidsResponseDto } from "./dto/classify-rfids-response.dto";
import { WarehouseAssetFilterDto } from "./dto/warehouse-asset-filter.dto";
import { WarehouseAssetResponseDto } from "./dto/warehouse-asset-response.dto";
import { BulkLocationUpdateDto, BulkLocationUpdateResultDto } from "./dto/bulk-location-update.dto";
import { UnidentifiedAssetFilterDto } from "./dto/unidentified-asset-filter.dto";
import { AssetHistoryResponseDto } from "./dto/asset-history-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";

@ApiTags("Assets")
@Controller("api/v1/assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  
  @Post("/allow-move")
  @ApiOperation({ summary: "Kiểm tra trạng thái cho phép di chuyển của tài sản" })
  @ApiResponse({ 
    status: 200,
    description: "Allow move status retrieved successfully",
    type: Boolean 
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @ApiBody({ description: 'RFID của tài sản cần kiểm tra', required: true, isArray: true })
  async getAllowMoveStatus(@Body() rfids: string[]): Promise<{ rfid: string; allowMove: boolean }[]> {
    return await this.assetsService.findByRfids(rfids);
  }

  @Post("unidentified")
  @ApiOperation({
    summary: "Lấy danh sách tài sản chưa được định danh",
    description: "Trả về danh sách tài sản chưa được định danh với phân trang. Công cụ dụng cụ: chưa có vị trí. Tài sản cố định: chưa có vị trí và RFID tag."
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách tài sản chưa được định danh với phân trang",
    type: PaginatedResponseDto<AssetResponseDto>,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiBody({ type: UnidentifiedAssetFilterDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_IDENTIFY_ASSET)
  @ApiBearerAuth()
  async findUnidentifiedAssets(
    @Body() filterDto: UnidentifiedAssetFilterDto,
    @CurrentUser() currentUser: User
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    return this.assetsService.findUnidentifiedAssets(filterDto, currentUser);
  }

  @Post()
  @ApiOperation({ summary: "Định danh tài sản - cả cố định, công cụ dụng cụ" })
  @ApiResponse({
    status: 201,
    description: "Asset created successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions(PermissionConstants.PERM_IDENTIFY_ASSET)
  @ApiBearerAuth()
  async create(
    @Body() createAssetDto: CreateAssetDto,
    @CurrentUser() currentUser: User
  ): Promise<AssetResponseDto> {
    return this.assetsService.create(createAssetDto, currentUser);
  }

  @Get("import-template")
  @ApiOperation({
    summary: "Tải file Excel mẫu để import tài sản",
    description: "Download file Excel template với cấu trúc và hướng dẫn đầy đủ"
  })
  @ApiResponse({
    status: 200,
    description: "Template file downloaded successfully",
  })
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.assetsService.generateImportTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Mau_Import_Tai_San.xlsx');
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  }

  @Get()
  @ApiOperation({ summary: "Tìm kiếm và lấy danh sách tài sản" })
  @ApiResponse({ status: 200, description: "Assets retrieved successfully" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async findAll() {
    return this.assetsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết tài sản" })
  @ApiResponse({
    status: 200,
    description: "Asset retrieved successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<AssetResponseDto> {
    return this.assetsService.findOne(id);
  }

  @Get(":id/history")
  @ApiOperation({ 
    summary: "Lấy lịch sử di chuyển và giao dịch của tài sản",
    description: "Trả về tất cả lịch sử giao dịch, di chuyển và thanh lý của tài sản"
  })
  @ApiResponse({
    status: 200,
    description: "Asset history retrieved successfully",
    type: AssetHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async getAssetHistory(@Param("id") id: string): Promise<AssetHistoryResponseDto> {
    return this.assetsService.getAssetHistory(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Chỉnh sửa tài sản" })
  @ApiResponse({
    status: 200,
    description: "Asset updated successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_ASSET)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @CurrentUser() currentUser: User
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, updateAssetDto, currentUser);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa tài sản" })
  @ApiResponse({ status: 204, description: "Asset deleted successfully" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_ASSET)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.assetsService.remove(id);
  }

  @Patch(":id/propose-liquidation")
  @ApiOperation({ summary: "Đề xuất thanh lý tài sản: cập nhật trạng thái tài sản và sổ tài sản" })
  @ApiResponse({
    status: 200,
    description: "Asset proposed for liquidation successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_ASSET)
  @ApiBearerAuth()
  async proposeLiquidation(
    @Param("id") id: string,
    @Body() body: { note?: string }
  ): Promise<AssetResponseDto> {
    return this.assetsService.proposeLiquidation(id, body?.note);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Import tài sản từ file Excel (batch processing)",
    description:
      "Import tài sản từ file Excel với cấu trúc 13 cột (A-M). Tự động chia thành batch 5-10 dòng một lần để xử lý. Bao gồm cả RFID tag cho tài sản cố định.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File Excel chứa dữ liệu tài sản",
    type: "multipart/form-data",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File Excel (.xlsx, .xls) với cấu trúc 13 cột (A-M)",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Assets imported successfully",
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - Invalid file format, data, or quantity limit exceeded",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_ASSET)
  @ApiBearerAuth()
  async importFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Only Excel files (.xlsx, .xls) are allowed"
      );
    }

    return this.assetsService.importFromExcel(file, currentUser);
  }

  @Post("import-unidentified")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Import tài sản chưa định danh từ file Excel",
    description:
      "Import tài sản từ file Excel với cấu trúc đơn giản hơn, hỗ trợ mã phòng (roomCode) thay vì roomId. " +
      "Cột: Tên TS | Thông số | Loại | Danh mục | Đơn vị | Số lượng | Ngày nhập | Nguồn gốc | Gói thầu | Mã phòng | Vị trí trong phòng | RFID",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File Excel chứa dữ liệu tài sản",
    type: "multipart/form-data",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File Excel (.xlsx, .xls) với 12 cột dữ liệu",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Assets imported successfully",
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid file format or data",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_IDENTIFY_ASSET)
  @ApiBearerAuth()
  async importUnidentifiedAssets(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    // Kiểm tra định dạng file
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Only Excel files (.xlsx, .xls) are allowed"
      );
    }

    return this.assetsService.importUnidentifiedAssets(file, currentUser);
  }

  @Post("rfid/classify")
  @ApiOperation({ summary: "Phân loại RFID tags theo phòng hiện tại" })
  @ApiResponse({ 
    status: 200, 
    description: "RFID classification completed successfully",
    type: ClassifyRfidsResponseDto
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBody({ type: ClassifyRfidsDto })
  @ApiBearerAuth()
  async classifyRfids(@Body() classifyRfidsDto: ClassifyRfidsDto): Promise<ClassifyRfidsResponseDto> {
    return this.assetsService.classifyRfids(
      classifyRfidsDto.rfids,
      classifyRfidsDto.currentRoomId,
      classifyRfidsDto.currentUnitId
    );
  }

  @Post("warehouse/filter")
  @ApiOperation({
    summary: "Lọc danh sách tài sản đang chờ tiếp nhận tại kho",
    description: "Lấy danh sách tài sản đã được bàn giao (RECEIVED) nhưng vẫn chưa được cập nhật vị trí phòng (đang ở kho)"
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách tài sản kho với phân trang",
    type: PaginatedResponseDto<WarehouseAssetResponseDto>,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async findWarehouseAssets(
    @Body() filterDto: WarehouseAssetFilterDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedResponseDto<WarehouseAssetResponseDto>> {
    return this.assetsService.findWarehouseAssets(filterDto, currentUser);
  }

  @Get("warehouse/units")
  @ApiOperation({
    summary: "Lấy danh sách đơn vị có quyền xem trong warehouse",
    description: "Trả về danh sách units mà user hiện tại có quyền xem tài sản warehouse"
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách units available",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          unitCode: { type: "number" }
        }
      }
    }
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async getWarehouseUnits(
    @CurrentUser() currentUser: User,
  ): Promise<{ id: string; name: string; unitCode: number }[]> {
    return this.assetsService.getWarehouseUnits(currentUser);
  }

  @Post("bulk-update-locations")
  @ApiOperation({
    summary: "Cập nhật vị trí hàng loạt cho tài sản warehouse",
    description: "Cập nhật phòng mới cho nhiều tài sản cùng lúc. Chỉ áp dụng cho tài sản đang ở kho (warehouse)"
  })
  @ApiResponse({
    status: 200,
    description: "Cập nhật vị trí thành công",
    type: BulkLocationUpdateResultDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_ASSET)
  @ApiBearerAuth()
  async bulkUpdateLocations(
    @Body() updateDto: BulkLocationUpdateDto,
    @CurrentUser() currentUser: User,
  ): Promise<BulkLocationUpdateResultDto> {
    return this.assetsService.bulkUpdateLocations(updateDto, currentUser);
  }
  
}
