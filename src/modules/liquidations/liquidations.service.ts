import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateLiquidationProposalDto } from "./dto/create-liquidation.dto";
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

import { LiquidationStatus } from "../../common/shared/LiquidationStatus";
import { LiquidationProposal } from "src/entities/liquidation.entity";
import { LiquidationProposalItem } from "src/entities/liquidation-proposal-item";
import { LiquidationHistory } from "src/entities/liquidation-history.entity";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { FieldType } from "src/common/dto/filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";
import { User } from "src/entities/user.entity";
import { Unit } from "src/entities/unit.entity";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import { Asset } from "src/entities/asset.entity";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { AssetStatus } from "src/common/shared/AssetStatus";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import * as ExcelJS from "exceljs";

@Injectable()
export class LiquidationsService {
  constructor(
    @InjectRepository(LiquidationProposal)
    private proposalRepo: Repository<LiquidationProposal>,
    @InjectRepository(LiquidationProposalItem)
    private itemRepo: Repository<LiquidationProposalItem>,
    @InjectRepository(LiquidationHistory)
    private historyRepo: Repository<LiquidationHistory>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(AssetBookItem)
    private assetBookItemRepo: Repository<AssetBookItem>,
    private permissionHelper: PermissionHelperService
  ) {}

  async createProposal(
    createDto: CreateLiquidationProposalDto,
    proposerId: string
  ) {
    // Tạo proposal với status từ frontend hoặc mặc định là DRAFT
    const proposal = this.proposalRepo.create({
      proposerId,
      unitId: createDto.unitId,
      status: createDto.status || LiquidationStatus.DRAFT,
    });

    const savedProposal = await this.proposalRepo.save(proposal);

    // Tạo các items
    const items = createDto.items.map((item) =>
      this.itemRepo.create({
        ...item,
        proposalId: savedProposal.id,
      })
    );

    await this.itemRepo.save(items);

    // Tạo history record đầu tiên
    const initialHistory = this.historyRepo.create({
      proposalId: savedProposal.id,
      handlerId: proposerId,
      actionStatus: createDto.status || LiquidationStatus.DRAFT,
      note:
        createDto.status === LiquidationStatus.PROPOSED
          ? "Đề xuất thanh lý được tạo và gửi đi"
          : "Đề xuất thanh lý được tạo (nháp)",
    });

    await this.historyRepo.save(initialHistory);

    return this.getProposalById(savedProposal.id);
  }

  async findAllWithFilter(
    filterDto: LiquidationProposalFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<LiquidationProposalResponseDto>> {
    try {
      const config = {
        searchFields: [
          "items.asset.name",
          "items.asset.fixedCode",
          "items.asset.ktCode",
          "items.note",
          "unit.name",
          "status",
        ],
        fieldTypeMap: {
          status: FieldType.SELECT,
          unitId: FieldType.SELECT,
          year: FieldType.NUMBER,
          createdAt: FieldType.DATE,
          updatedAt: FieldType.DATE,
          // Asset fields for sorting
          "items.asset.name": FieldType.TEXT,
          "items.asset.fixedCode": FieldType.TEXT,
          "items.asset.ktCode": FieldType.TEXT,
          "items.asset.type": FieldType.SELECT,
          "items.asset.entrydate": FieldType.DATE,
          // Room fields for sorting (through asset.currentRoom)
          "items.asset.currentRoom.name": FieldType.TEXT,
          "items.asset.currentRoom.code": FieldType.TEXT,
          // Quantity fields
          "items.systemQuantity": FieldType.NUMBER,
          "items.countedQuantity": FieldType.NUMBER,
        },
        defaultSorting: { field: "createdAt", direction: "DESC" as const },
        relations: [
          "proposer",
          "unit",
          "items.asset",
          "items.asset.currentRoom",
          "histories.handler",
        ],
      };

      // Tạo filter permission-based cho unitId
      const unitAccessFilter =
        await this.permissionHelper.createUnitAccessFilter(currentUser);

      // Check if user has no access to any units (null UUID indicates no access)
      if (
        unitAccessFilter.value.includes("00000000-0000-0000-0000-000000000000")
      ) {
        // Return empty result immediately if user has no access
        return new PaginatedResponseDto([], {
          page: 1,
          limit: filterDto.pagination?.itemsPerPage || 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }

      // Handle quick filters for backward compatibility
      const quickFilterConditions = [unitAccessFilter]; // Add unit access filter

      if (filterDto.status) {
        quickFilterConditions.push({
          field: "status",
          fieldType: "select",
          operator: "equals",
          value: [filterDto.status],
        });
      }

      if (filterDto.unitId) {
        // Kiểm tra xem user có quyền xem unit này không
        const accessibleUnitIds =
          await this.permissionHelper.getAccessibleUnitIds(currentUser);
        if (accessibleUnitIds.includes(filterDto.unitId)) {
          quickFilterConditions.push({
            field: "unitId",
            fieldType: "select",
            operator: "equals",
            value: [filterDto.unitId],
          });
        } else {
          // Nếu không có quyền, trả về kết quả rỗng
          return new PaginatedResponseDto([], {
            page: 1,
            limit: filterDto.pagination?.itemsPerPage || 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          });
        }
      }

      if (filterDto.year) {
        // Filter by year of creation
        const yearStart = new Date(`${filterDto.year}-01-01T00:00:00.000Z`);
        const yearEnd = new Date(`${filterDto.year}-12-31T23:59:59.999Z`);

        quickFilterConditions.push({
          field: "createdAt",
          fieldType: "date",
          operator: "between",
          value: [yearStart.toISOString(), yearEnd.toISOString()],
        });
      }

      // Merge with existing conditions
      filterDto.conditions = [
        ...(filterDto.conditions || []),
        ...quickFilterConditions,
      ];

      return FilterUtil.getFilteredResults(
        this.proposalRepo,
        filterDto,
        LiquidationProposalResponseDto,
        config,
        "proposal"
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async updateProposal(
    id: string,
    updateDto: UpdateLiquidationProposalDto,
    updaterId: string
  ) {
    const proposal = await this.proposalRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    // Chỉ cho phép cập nhật khi đề xuất đang ở trạng thái PROPOSED (dự thảo)
    if (proposal.status !== LiquidationStatus.DRAFT) {
      throw new BadRequestException(
        "Chỉ có thể cập nhật đề xuất đang ở trạng thái nháp (DRAFT)"
      );
    }

    // Cập nhật thông tin đề xuất
    if (updateDto.unitId) {
      proposal.unitId = updateDto.unitId;
    }

    // Cập nhật items nếu có
    if (updateDto.items && updateDto.items.length > 0) {
      // Xóa tất cả items cũ
      await this.itemRepo.delete({ proposalId: id });

      // Tạo items mới
      const newItems = updateDto.items.map((item) =>
        this.itemRepo.create({
          assetId: item.assetId,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity,
          note: item.note,
          imageUrl: item.imageUrl,
          proposalId: id,
        })
      );

      await this.itemRepo.save(newItems);
    }

    const updateHistory = this.historyRepo.create({
      proposalId: id,
      handlerId: updaterId,
      actionStatus: LiquidationStatus.DRAFT,
      note: "Đề xuất thanh lý được cập nhật",
    });

    await this.historyRepo.save(updateHistory);

    return this.getProposalById(id);
  }

  async getProposalById(id: string) {
    const proposal = await this.proposalRepo.findOne({
      where: { id },
      relations: [
        "proposer",
        "unit",
        "items",
        "items.asset",
        "items.asset.currentRoom",
        "histories",
        "histories.handler",
      ],
    });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    return proposal;
  }

  async updateStatus(
    id: string,
    updateDto: UpdateLiquidationStatusDto,
    handlerId: string
  ) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    // Validate status transition
    this.validateStatusTransition(proposal.status, updateDto.status);

    // Update proposal status
    proposal.status = updateDto.status;
    await this.proposalRepo.save(proposal);

    // Create history record
    const history = this.historyRepo.create({
      proposalId: id,
      handlerId,
      actionStatus: updateDto.status,
      evidenceUrl: updateDto.evidenceUrl,
      note: updateDto.note ?? this.getStatusChangeMessage(updateDto.status),
    });

    await this.historyRepo.save(history);

    return this.getProposalById(id);
  }

  async uploadEvidence(
    id: string,
    evidenceDto: UploadEvidenceDto,
    handlerId: string
  ) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    if (
      ![LiquidationStatus.APPROVED, LiquidationStatus.FINALIZED].includes(
        proposal.status
      )
    ) {
      throw new BadRequestException(
        "Chỉ có thể upload minh chứng cho đề xuất đã được duyệt hoặc hoàn tất"
      );
    }

    // Create evidence history record
    const history = this.historyRepo.create({
      proposalId: id,
      handlerId,
      actionStatus: proposal.status,
      evidenceUrl: evidenceDto.evidenceUrl,
      note: evidenceDto.note || "Upload minh chứng bổ sung",
    });

    await this.historyRepo.save(history);

    return {
      message: "Minh chứng đã được upload thành công",
      evidenceUrl: evidenceDto.evidenceUrl,
    };
  }

  async sendProposal(id: string, sendDto: SendProposalDto, handlerId: string) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    if (proposal.status !== LiquidationStatus.DRAFT) {
      throw new BadRequestException(
        "Chỉ có thể gửi đề xuất đang ở trạng thái nháp (DRAFT)"
      );
    }

    // Update proposal status to PROPOSED
    proposal.status = LiquidationStatus.PROPOSED;
    await this.proposalRepo.save(proposal);

    // Create history record
    const history = this.historyRepo.create({
      proposalId: id,
      handlerId,
      actionStatus: LiquidationStatus.PROPOSED,
      evidenceUrl: sendDto.evidenceUrl,
      note: sendDto.note ?? "Đề xuất thanh lý được gửi đi để xem xét",
    });

    await this.historyRepo.save(history);

    return this.getProposalById(id);
  }

  async approveProposal(
    id: string,
    approveDto: ApproveProposalDto,
    handlerId: string
  ) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    if (proposal.status !== LiquidationStatus.PROPOSED) {
      throw new BadRequestException(
        "Chỉ có thể phê duyệt đề xuất đang ở trạng thái đề xuất (PROPOSED)"
      );
    }

    // Update proposal status to APPROVED
    proposal.status = LiquidationStatus.APPROVED;
    await this.proposalRepo.save(proposal);

    // Create history record
    const history = this.historyRepo.create({
      proposalId: id,
      handlerId,
      actionStatus: LiquidationStatus.APPROVED,
      evidenceUrl: approveDto.evidenceUrl,
      note: approveDto.note ?? "Đề xuất thanh lý đã được phê duyệt",
    });

    await this.historyRepo.save(history);

    return this.getProposalById(id);
  }

  async finalizeProposal(
    id: string,
    finalizeDto: FinalizeProposalDto,
    handlerId: string
  ) {
    const proposal = await this.proposalRepo.findOne({ 
      where: { id },
      relations: ["items"]
    });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    if (proposal.status !== LiquidationStatus.APPROVED) {
      throw new BadRequestException(
        "Chỉ có thể hoàn thành đề xuất đang ở trạng thái đã phê duyệt (APPROVED)"
      );
    }

    // Update proposal status to FINALIZED
    proposal.status = LiquidationStatus.FINALIZED;
    await this.proposalRepo.save(proposal);

    // Cập nhật trạng thái của các asset thành LIQUIDATED
    for (const item of proposal.items) {
      // Cập nhật trạng thái asset
      await this.assetRepo.update(
        { id: item.assetId },
        { status: AssetStatus.LIQUIDATED }
      );

      // Tìm và cập nhật AssetBookItem mới nhất của asset này
      const latestAssetBookItem = await this.assetBookItemRepo.findOne({
        where: { assetId: item.assetId },
        order: { assignedAt: "DESC" }
      });

      if (latestAssetBookItem) {
        await this.assetBookItemRepo.update(
          { id: latestAssetBookItem.id },
          { status: AssetBookItemStatus.LIQUIDATED }
        );
      }
    }

    // Create history record
    const history = this.historyRepo.create({
      proposalId: id,
      handlerId,
      actionStatus: LiquidationStatus.FINALIZED,
      evidenceUrl: finalizeDto.evidenceUrl,
      note: finalizeDto.note ?? "Đề xuất thanh lý đã được hoàn thành",
    });

    await this.historyRepo.save(history);

    return this.getProposalById(id);
  }

  private validateStatusTransition(
    currentStatus: LiquidationStatus,
    newStatus: LiquidationStatus
  ) {
    const validTransitions = {
      [LiquidationStatus.PROPOSED]: [
        LiquidationStatus.APPROVED,
        LiquidationStatus.REJECTED,
      ],
      [LiquidationStatus.APPROVED]: [
        LiquidationStatus.FINALIZED,
        LiquidationStatus.REJECTED,
      ],
      [LiquidationStatus.REJECTED]: [],
      [LiquidationStatus.FINALIZED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${currentStatus} sang ${newStatus}`
      );
    }
  }

  async findAllSimplified(
    filterDto: LiquidationProposalFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<SimplifiedLiquidationResponseDto>> {
    try {
      const config = {
        searchFields: [
          "items.asset.name",
          "items.asset.fixedCode",
          "items.asset.ktCode",
          "items.note",
          "unit.name",
          "status",
        ],
        fieldTypeMap: {
          status: FieldType.SELECT,
          unitId: FieldType.SELECT,
          year: FieldType.NUMBER,
          createdAt: FieldType.DATE,
          updatedAt: FieldType.DATE,
        },
        defaultSorting: { field: "createdAt", direction: "DESC" as const },
        relations: ["unit", "items.asset"],
      };

      // Tạo filter permission-based cho unitId
      const unitAccessFilter =
        await this.permissionHelper.createUnitAccessFilter(currentUser);

      // Check if user has no access to any units (null UUID indicates no access)
      if (
        unitAccessFilter.value.includes("00000000-0000-0000-0000-000000000000")
      ) {
        // Return empty result immediately if user has no access
        return new PaginatedResponseDto([], {
          page: 1,
          limit: filterDto.pagination?.itemsPerPage || 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }

      // Handle quick filters for backward compatibility
      const quickFilterConditions = [unitAccessFilter]; // Add unit access filter

      // Rule for administrators: exclude drafts (DRAFT status)
      if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        quickFilterConditions.push({
          field: "status",
          fieldType: "select",
          operator: "in",
          value: [
            LiquidationStatus.PROPOSED,
            LiquidationStatus.APPROVED,
            LiquidationStatus.REJECTED,
            LiquidationStatus.FINALIZED,
          ],
        });
      }

      if (filterDto.status) {
        quickFilterConditions.push({
          field: "status",
          fieldType: "select",
          operator: "equals",
          value: [filterDto.status],
        });
      }

      if (filterDto.unitId) {
        // Kiểm tra xem user có quyền xem unit này không
        const accessibleUnitIds =
          await this.permissionHelper.getAccessibleUnitIds(currentUser);
        if (accessibleUnitIds.includes(filterDto.unitId)) {
          quickFilterConditions.push({
            field: "unitId",
            fieldType: "select",
            operator: "equals",
            value: [filterDto.unitId],
          });
        } else {
          // Nếu không có quyền, trả về kết quả rỗng
          return new PaginatedResponseDto([], {
            page: 1,
            limit: filterDto.pagination?.itemsPerPage || 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          });
        }
      }

      if (filterDto.year) {
        // Filter by year of creation
        const yearStart = new Date(`${filterDto.year}-01-01T00:00:00.000Z`);
        const yearEnd = new Date(`${filterDto.year}-12-31T23:59:59.999Z`);

        quickFilterConditions.push({
          field: "createdAt",
          fieldType: "date",
          operator: "between",
          value: [yearStart.toISOString(), yearEnd.toISOString()],
        });
      }

      // Merge with existing conditions
      filterDto.conditions = [
        ...(filterDto.conditions || []),
        ...quickFilterConditions,
      ];

      return FilterUtil.getFilteredResults(
        this.proposalRepo,
        filterDto,
        SimplifiedLiquidationResponseDto,
        config,
        "proposal"
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private getStatusChangeMessage(status: LiquidationStatus): string {
    const messages = {
      [LiquidationStatus.DRAFT]: "Đề xuất thanh lý được tạo (nháp)",
      [LiquidationStatus.PROPOSED]: "Đề xuất thanh lý được tạo",
      [LiquidationStatus.APPROVED]: "Phòng quản trị đã chấp nhận đề xuất",
      [LiquidationStatus.REJECTED]: "Phòng quản trị đã từ chối đề xuất",
      [LiquidationStatus.FINALIZED]: "Trường đã duyệt hoàn tất đề xuất",
    };

    return messages[status] || "Cập nhật trạng thái";
  }

  async exportToExcel(id: string): Promise<Buffer> {
    const proposal = await this.proposalRepo.findOne({
      where: { id },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.asset.currentRoom",
      ],
    });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Danh mục thanh lý");

    // Thiết lập độ rộng cột
    worksheet.columns = [
      { key: "stt", width: 5 },
      { key: "fixedCode", width: 12 },
      { key: "ktCode", width: 12 },
      { key: "name", width: 40 },
      { key: "specs", width: 30 },
      { key: "roomCode", width: 10 },
      { key: "systemQty", width: 10 },
      { key: "actualQty", width: 10 },
      { key: "note", width: 20 },
    ];

    // Tiêu đề - Dòng 1: TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP HỒ CHÍ MINH
    worksheet.mergeCells("A1:I1");
    const headerRow1 = worksheet.getCell("A1");
    headerRow1.value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP HỒ CHÍ MINH";
    headerRow1.font = { name: "Arial", size: 9, bold: true };
    headerRow1.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 2: Địa chỉ
    worksheet.mergeCells("A2:I2");
    const headerRow2 = worksheet.getCell("A2");
    headerRow2.value = "Địa chỉ: 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP Hồ Chí Minh";
    headerRow2.font = { name: "Arial", size: 9 };
    headerRow2.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 3: Trống
    worksheet.addRow([]);

    // Dòng 4: Tiêu đề chính
    worksheet.mergeCells("A4:I4");
    const titleRow = worksheet.getCell("A4");
    titleRow.value = "DANH MỤC TÀI SẢN CỐ ĐỊNH ĐỀ XUẤT THANH LÝ";
    titleRow.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFF0000" } };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 5: Đơn vị
    worksheet.mergeCells("A5:I5");
    const unitRow = worksheet.getCell("A5");
    unitRow.value = proposal.unit?.name || "KHOA CÔNG NGHỆ THÔNG TIN";
    unitRow.font = { name: "Arial", size: 9, bold: true };
    unitRow.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 6: Năm
    worksheet.mergeCells("A6:I6");
    const yearRow = worksheet.getCell("A6");
    const year = new Date(proposal.createdAt).getFullYear();
    yearRow.value = `NĂM ${year}`;
    yearRow.font = { name: "Arial", size: 9, bold: true };
    yearRow.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 7: Trống
    worksheet.addRow([]);

    // Dòng 8: Header của bảng
    const headerRow = worksheet.addRow([
      "STT",
      "MÃ TSCĐ",
      "MÃ KT",
      "TÊN TSCĐ",
      "THÔNG SỐ KỸ THUẬT",
      "MÃ VỊ TRÍ",
      "SL THEO SỔ SÁCH",
      "SL THEO THỰC TẾ",
      "GHI CHÚ",
    ]);

    headerRow.height = 30;
    headerRow.font = { name: "Arial", size: 9, bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };

    // Tô viền cho header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Thêm dữ liệu
    proposal.items.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.asset?.fixedCode || "",
        item.asset?.ktCode || "",
        item.asset?.name || "",
        item.asset?.specs || "",
        item.asset?.currentRoom?.roomCode || "",
        item.systemQuantity,
        item.countedQuantity,
        item.note || "",
      ]);

      row.font = { name: "Arial", size: 9 };
      row.alignment = { vertical: "middle", wrapText: true };

      // Căn giữa cho các cột số
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };

      // Tô viền cho từng cell
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Thêm phần chữ ký (sau dữ liệu 2 dòng)
    const lastDataRow = 8 + proposal.items.length;
    const signatureRow = lastDataRow + 2;

    // Ngày tháng
    worksheet.mergeCells(`A${signatureRow}:I${signatureRow}`);
    const dateCell = worksheet.getCell(`A${signatureRow}`);
    const today = new Date();
    dateCell.value = `Ngày ${today.getDate()} Tháng ${today.getMonth() + 1} Năm ${today.getFullYear()}`;
    dateCell.font = { name: "Arial", size: 9 };
    dateCell.alignment = { horizontal: "right", vertical: "middle" };

    // Dòng chữ ký - 4 cột
    const signatureLabelRow = signatureRow + 2;
    worksheet.mergeCells(`A${signatureLabelRow}:B${signatureLabelRow}`);
    worksheet.mergeCells(`C${signatureLabelRow}:D${signatureLabelRow}`);
    worksheet.mergeCells(`E${signatureLabelRow}:F${signatureLabelRow}`);
    worksheet.mergeCells(`G${signatureLabelRow}:I${signatureLabelRow}`);

    const col1 = worksheet.getCell(`A${signatureLabelRow}`);
    col1.value = "Người lập biểu";
    col1.font = { name: "Arial", size: 9, bold: true };
    col1.alignment = { horizontal: "center", vertical: "middle" };

    const col2 = worksheet.getCell(`C${signatureLabelRow}`);
    col2.value = "Thư ký";
    col2.font = { name: "Arial", size: 9, bold: true };
    col2.alignment = { horizontal: "center", vertical: "middle" };

    const col3 = worksheet.getCell(`E${signatureLabelRow}`);
    col3.value = "Trưởng nhóm kiểm kê";
    col3.font = { name: "Arial", size: 9, bold: true };
    col3.alignment = { horizontal: "center", vertical: "middle" };

    const col4 = worksheet.getCell(`G${signatureLabelRow}`);
    col4.value = "Đại diện ĐV sử dụng";
    col4.font = { name: "Arial", size: 9, bold: true };
    col4.alignment = { horizontal: "center", vertical: "middle" };

    // Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
