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
} from "@nestjs/common";
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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Assets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: "Định danh tài sản - cả cố định, công cụ dụng cụ" })
  @ApiResponse({
    status: 201,
    description: "Asset created successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_IDENTIFY_ASSET)
  @ApiBearerAuth()
  async create(
    @Body() createAssetDto: CreateAssetDto,
    @CurrentUser() currentUser: User
  ): Promise<AssetResponseDto> {
    return this.assetsService.create(createAssetDto, currentUser);
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
    @Body() updateAssetDto: UpdateAssetDto
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, updateAssetDto);
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

  @Patch(":id/rfid")
  @ApiOperation({ summary: "Cập nhật RFID tag cho tài sản cố định" })
  @ApiResponse({
    status: 200,
    description: "RFID tag updated successfully",
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Only Fixed Assets can have RFID tags",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_RFID)
  @ApiBearerAuth()
  async updateRfidTag(
    @Param("id") id: string,
    @Body() updateRfidDto: UpdateRfidDto
  ): Promise<AssetResponseDto> {
    return this.assetsService.updateRfidTag(id, updateRfidDto);
  }

  @Delete(":id/rfid")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa RFID tag khỏi tài sản" })
  @ApiResponse({ status: 204, description: "RFID tag removed successfully" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Asset does not have RFID tag",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_ASSET)
  @ApiBearerAuth()
  async removeRfidTag(@Param("id") id: string): Promise<void> {
    await this.assetsService.removeRfidTag(id);
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
  @Permissions(PermissionConstants.PERM_IMPORT_ASSET)
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
}
