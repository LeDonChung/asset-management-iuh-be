import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateLiquidationProposalDto } from "./dto/create-liquidation.dto";
import { ImportLiquidationResultDto } from "./dto/import-liquidation.dto";
import {
  UpdateLiquidationStatusDto,
  UploadEvidenceDto,
  SendProposalDto,
  ApproveProposalDto,
  FinalizeProposalDto,
} from "./dto/update-liquidation.dto";
import { UpdateLiquidationProposalDto } from "./dto/update-liquidation-proposal.dto";
import { LiquidationProposalFilterDto } from "./dto/filter-liquidation.dto";
import { LiquidationProposalResponseDto } from "./dto/response-liquidation.dto";
import { SimplifiedLiquidationResponseDto } from "./dto/simplified-liquidation-response.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/auth/guards/permissions.guard";
import { CurrentUser } from "src/modules/auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { Permissions } from "src/modules/auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { LiquidationsService } from "./liquidations.service";
import { AssetType } from "src/common/shared/AssetType";
import { PermissionHelperService } from "src/common/services/permission-helper.service";

@ApiTags("Liquidations")
@Controller("api/v1/liquidations")
export class LiquidationsController {
  constructor(
    private readonly liquidationsService: LiquidationsService,
    private readonly permissionHelper: PermissionHelperService
  ) {}

  @Post()
  @ApiOperation({
    summary: "Tạo mới đề xuất thanh lý",
    description:
      "Tạo đề xuất thanh lý với danh sách tài sản cần thanh lý. Chỉ người dùng có quyền của đơn vị mới có thể tạo đề xuất.",
  })
  @ApiResponse({
    status: 201,
    description: "Đề xuất thanh lý đã được tạo thành công",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(
    PermissionConstants.PERM_CREATE_LIQUIDATION,
    PermissionConstants.PERM_PROPOSED_LIQUIDATION
  )
  create(
    @Body() createDto: CreateLiquidationProposalDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.createProposal(createDto, currentUser.id);
  }

  @Post("filter")
  @ApiOperation({
    summary: "Lọc danh sách đề xuất thanh lý (phiên bản rút gọn)",
    description:
      "Lọc và phân trang danh sách đề xuất thanh lý với thông tin rút gọn: đơn vị, loại tài sản, trạng thái, ngày tạo.",
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách đề xuất thanh lý rút gọn với phân trang",
    type: PaginatedResponseDto<SimplifiedLiquidationResponseDto>,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu filter không hợp lệ" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async filterSimplified(
    @Body() filterDto: LiquidationProposalFilterDto,
    @CurrentUser() currentUser: User
  ): Promise<PaginatedResponseDto<SimplifiedLiquidationResponseDto>> {
    return this.liquidationsService.findAllSimplified(filterDto, currentUser);
  }

  @Put(":id")
  @ApiOperation({
    summary: "Cập nhật đề xuất thanh lý",
    description:
      "Cập nhật thông tin đề xuất thanh lý. Chỉ có thể cập nhật khi đề xuất đang ở trạng thái PROPOSED (dự thảo).",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Đề xuất thanh lý đã được cập nhật thành công",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Dữ liệu đầu vào không hợp lệ hoặc không thể cập nhật đề xuất",
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_LIQUIDATION)
  async updateProposal(
    @Param("id") id: string,
    @Body() updateDto: UpdateLiquidationProposalDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.updateProposal(
      id,
      updateDto,
      currentUser.id
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "Xem chi tiết đề xuất thanh lý",
    description:
      "Lấy thông tin chi tiết của một đề xuất thanh lý bao gồm danh sách tài sản và lịch sử xử lý.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Chi tiết đề xuất thanh lý",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  findOne(@Param("id") id: string) {
    return this.liquidationsService.getProposalById(id);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "Cập nhật trạng thái đề xuất thanh lý",
    description:
      "Cập nhật trạng thái đề xuất (PROPOSED → APPROVED/REJECTED, APPROVED → FINALIZED). Tự động tạo lịch sử xử lý.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Trạng thái đã được cập nhật",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Chuyển trạng thái không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_LIQUIDATION)
  updateStatus(
    @Param("id") id: string,
    @Body() updateDto: UpdateLiquidationStatusDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.updateStatus(id, updateDto, currentUser.id);
  }

  @Patch(":id/send")
  @ApiOperation({
    summary: "Gửi đề xuất thanh lý",
    description:
      "Gửi đề xuất thanh lý từ trạng thái DRAFT sang PROPOSED với minh chứng.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Đề xuất đã được gửi thành công",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Không thể gửi đề xuất" })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_PROPOSED_LIQUIDATION)
  sendProposal(
    @Param("id") id: string,
    @Body() sendDto: SendProposalDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.sendProposal(id, sendDto, currentUser.id);
  }

  @Patch(":id/approve")
  @ApiOperation({
    summary: "Phê duyệt đề xuất thanh lý",
    description:
      "Phê duyệt đề xuất thanh lý từ trạng thái PROPOSED sang APPROVED với minh chứng.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Đề xuất đã được phê duyệt thành công",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Không thể phê duyệt đề xuất" })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_APPROVE_LIQUIDATION)
  approveProposal(
    @Param("id") id: string,
    @Body() approveDto: ApproveProposalDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.approveProposal(
      id,
      approveDto,
      currentUser.id
    );
  }

  @Patch(":id/finalize")
  @ApiOperation({
    summary: "Hoàn thành đề xuất thanh lý",
    description:
      "Hoàn thành đề xuất thanh lý từ trạng thái APPROVED sang FINALIZED.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Đề xuất đã được hoàn thành thành công",
    type: LiquidationProposalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Không thể hoàn thành đề xuất" })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_FINALIZED_LIQUIDATION)
  finalizeProposal(
    @Param("id") id: string,
    @Body() finalizeDto: FinalizeProposalDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.finalizeProposal(
      id,
      finalizeDto,
      currentUser.id
    );
  }

  @Post(":id/evidence")
  @ApiOperation({
    summary: "Upload minh chứng cho đề xuất đã duyệt",
    description:
      "Upload minh chứng bổ sung cho đề xuất đã được phê duyệt hoặc hoàn tất. Tạo thêm bản ghi lịch sử.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "Minh chứng đã được upload thành công",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        evidenceUrl: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Không thể upload minh chứng cho đề xuất này",
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_LIQUIDATION)
  uploadEvidence(
    @Param("id") id: string,
    @Body() evidenceDto: UploadEvidenceDto,
    @CurrentUser() currentUser: User
  ) {
    return this.liquidationsService.uploadEvidence(
      id,
      evidenceDto,
      currentUser.id
    );
  }

  @Get(":id/export")
  @ApiOperation({
    summary: "Xuất file Excel danh sách tài sản thanh lý",
    description:
      "Xuất file Excel chứa danh sách tài sản cố định đề xuất thanh lý theo mẫu của trường.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "File Excel đã được tạo thành công",
    content: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async exportToExcel(
    @Param("id") id: string,
    @Res() res: Response
  ) {
    const buffer = await this.liquidationsService.exportAssetsForLiquidation(id);
    
    const fileName = `Danh_muc_thanh_ly_${id}_${new Date().getTime()}.xlsx`;
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", buffer.length);
    
    res.send(buffer);
  }

  @Post("import")
  @ApiOperation({
    summary: "Import danh sách tài sản thanh lý từ file Excel",
    description:
      "Import danh sách tài sản thanh lý từ file Excel theo định dạng chuẩn. File Excel phải có các cột: STT, Mã TSCĐ, Mã KT, Tên TSCĐ, Thông số KT, Mã vị trí, SL theo sổ sách, SL theo thực tế, Ghi chú",
  })
  @ApiResponse({
    status: 201,
    description: "Import thành công",
    type: ImportLiquidationResultDto,
  })
  @ApiResponse({ status: 400, description: "File không hợp lệ hoặc dữ liệu không đúng định dạng" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @Permissions(
    PermissionConstants.PERM_CREATE_LIQUIDATION,
    PermissionConstants.PERM_PROPOSED_LIQUIDATION
  )
  async importFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body("unitId") unitId: string,
    @Body("assetType") assetType: AssetType,
    @CurrentUser() currentUser: User
  ): Promise<ImportLiquidationResultDto> {
    if (!file) {
      throw new BadRequestException("Vui lòng chọn file Excel để import");
    }

    // Validate file type
    const allowedMimeTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("File phải có định dạng Excel (.xls, .xlsx)");
    }

    // Validate required parameters
    if (!unitId) {
      throw new BadRequestException("unitId là bắt buộc");
    }

    if (!assetType) {
      throw new BadRequestException("assetType là bắt buộc");
    }

    return this.liquidationsService.importFromExcel(
      file,
      unitId,
      assetType,
      currentUser.id
    );
  }

  @Get("import/template")
  @ApiOperation({
    summary: "Tải template Excel để import danh sách tài sản thanh lý",
    description:
      "Tải file Excel template có sẵn format và dữ liệu mẫu để người dùng có thể điền thông tin tài sản cần thanh lý. Có thể chỉ định loại tài sản để có header phù hợp.",
  })
  @ApiQuery({
    name: "assetType",
    description: "Loại tài sản để tạo template phù hợp",
    required: false,
    enum: AssetType,
  })
  @ApiResponse({
    status: 200,
    description: "File template Excel đã được tạo thành công",
    content: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async downloadImportTemplate(
    @Query("assetType") assetType: AssetType,
    @Res() res: Response
  ) {
    const buffer = await this.liquidationsService.generateImportTemplate(assetType);
    
    const fileName = `Template_Import_Thanh_Ly_${new Date().getTime()}.xlsx`;
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", buffer.length);
    
    res.send(buffer);
  }

  @Get(":id/export-assets")
  @ApiOperation({
    summary: "Xuất danh sách tài sản trong đề xuất thanh lý",
    description:
      "Xuất file Excel chứa danh sách tài sản trong đề xuất thanh lý theo format chuẩn.",
  })
  @ApiParam({ name: "id", description: "ID của đề xuất thanh lý" })
  @ApiResponse({
    status: 200,
    description: "File Excel đã được tạo thành công",
    content: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy đề xuất" })
  @ApiResponse({ status: 401, description: "Chưa xác thực" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async exportAssetsForLiquidation(
    @Param("id") id: string,
    @Res() res: Response
  ) {
    const buffer = await this.liquidationsService.exportAssetsForLiquidation(id);
    
    const fileName = `Danh_sach_tai_san_thanh_ly_${id}_${new Date().getTime()}.xlsx`;
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", buffer.length);
    
    res.send(buffer);
  }
}
