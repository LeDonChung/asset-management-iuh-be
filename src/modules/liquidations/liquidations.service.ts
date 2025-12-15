import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
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
import { AssetBook } from "src/entities/asset-book.entity";
import { AssetStatus } from "src/common/shared/AssetStatus";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import { AssetType } from "src/common/shared/AssetType";
import * as ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { ImportLiquidationProposalDto, ImportLiquidationResultDto } from "./dto/import-liquidation.dto";

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
    @InjectRepository(AssetBook)
    private assetBookRepo: Repository<AssetBook>,
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>,
    private permissionHelper: PermissionHelperService,
    private dataSource: DataSource
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
      relations: ["items", "unit"]
    });

    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }

    if (proposal.status !== LiquidationStatus.APPROVED) {
      throw new BadRequestException(
        "Chỉ có thể hoàn thành đề xuất đang ở trạng thái đã phê duyệt (APPROVED)"
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      proposal.status = LiquidationStatus.FINALIZED;
      await queryRunner.manager.save(proposal);

      const currentYear = new Date().getFullYear();

      for (const item of proposal.items) {
        const asset = await queryRunner.manager.findOne(Asset, {
          where: { id: item.assetId }
        });

        if (!asset) {
          throw new NotFoundException(`Không tìm thấy tài sản ${item.assetId}`);
        }

        const liquidationQuantity = item.countedQuantity;

        const assetBook = await queryRunner.manager.findOne(AssetBook, {
          where: {
            unitId: proposal.unitId,
            year: currentYear
          }
        });

        if (!assetBook) {
          throw new NotFoundException(
            `Không tìm thấy sổ tài sản cho đơn vị ${proposal.unitId} năm ${currentYear}`
          );
        }

        const assetBookItems = await queryRunner.manager
          .createQueryBuilder(AssetBookItem, 'abi')
          .where('abi.bookId = :bookId', { bookId: assetBook.id })
          .andWhere('abi.assetId = :assetId', { assetId: item.assetId })
          .andWhere('abi.status = :status', { status: AssetBookItemStatus.IN_USE })
          .orderBy('abi.assignedAt', 'ASC')
          .getMany();

        let remainingLiquidationQty = liquidationQuantity;

        if (asset.type === AssetType.TOOLS_EQUIPMENT) {
          for (const bookItem of assetBookItems) {
            if (remainingLiquidationQty <= 0) break;

            const quantityToLiquidate = Math.min(bookItem.quantity, remainingLiquidationQty);
            const remainingQty = bookItem.quantity - quantityToLiquidate;

            if (remainingQty > 0) {
              bookItem.quantity = remainingQty;
              bookItem.note = `${bookItem.note || ''}\nThanh lý ${quantityToLiquidate} theo đề xuất ${id}. Còn lại: ${remainingQty}`.trim();
              await queryRunner.manager.save(bookItem);

              const originalQuantity = bookItem.quantity + quantityToLiquidate;
              const liquidatedBookItem = queryRunner.manager.create(AssetBookItem, {
                bookId: assetBook.id,
                assetId: item.assetId,
                roomId: bookItem.roomId,
                assignedAt: bookItem.assignedAt,
                quantity: quantityToLiquidate,
                status: AssetBookItemStatus.LIQUIDATED,
                note: `Thanh lý ${quantityToLiquidate} từ ${originalQuantity} theo đề xuất ${id}`,
              });
              await queryRunner.manager.save(liquidatedBookItem);
            } else {
              bookItem.quantity = 0;
              bookItem.status = AssetBookItemStatus.LIQUIDATED;
              bookItem.note = `${bookItem.note || ''}\nThanh lý ${quantityToLiquidate} theo đề xuất ${id}`.trim();
              await queryRunner.manager.save(bookItem);
            }

            remainingLiquidationQty -= quantityToLiquidate;
          }

          const currentAssetQuantity = asset.quantity || 0;
          const newAssetQuantity = Math.max(0, currentAssetQuantity - liquidationQuantity);
          
          await queryRunner.manager.update(
            Asset,
            { id: item.assetId },
            { 
              quantity: newAssetQuantity,
              status: newAssetQuantity === 0 ? AssetStatus.LIQUIDATED : AssetStatus.IN_USE
            }
          );

          if (remainingLiquidationQty > 0) {
            throw new BadRequestException(
              `Không đủ số lượng để thanh lý cho tài sản ${asset.fixedCode}. Thiếu: ${remainingLiquidationQty}`
            );
          }
        } else {
          if (liquidationQuantity > 0) {
            const bookItemToLiquidate = assetBookItems[0];
            
            if (bookItemToLiquidate) {
              bookItemToLiquidate.status = AssetBookItemStatus.LIQUIDATED;
              bookItemToLiquidate.note = `${bookItemToLiquidate.note || ''}\nThanh lý theo đề xuất ${id}`.trim();
              await queryRunner.manager.save(bookItemToLiquidate);
            }

            await queryRunner.manager.update(
              Asset,
              { id: item.assetId },
              { 
                status: AssetStatus.LIQUIDATED
              }
            );
          }
        }
      }
      const history = queryRunner.manager.create(LiquidationHistory, {
        proposalId: id,
        handlerId,
        actionStatus: LiquidationStatus.FINALIZED,
        evidenceUrl: finalizeDto.evidenceUrl,
        note: finalizeDto.note ?? "Đề xuất thanh lý đã được hoàn thành",
      });

      await queryRunner.manager.save(history);

      await queryRunner.commitTransaction();

      return this.getProposalById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  async exportAssetsForLiquidation(proposalId: string): Promise<Buffer> {
    // Lấy thông tin đề xuất thanh lý
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.asset.currentRoom"
      ]
    });
  
    if (!proposal) {
      throw new NotFoundException("Không tìm thấy đề xuất thanh lý");
    }
  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Danh sách tài sản có thể thanh lý");
  
    // Thiết lập độ rộng cột (chỉ set width, không set style gì khác)
    worksheet.getColumn(1).width = 5;   // STT
    worksheet.getColumn(2).width = 15;  // Mã TS/CDCC
    worksheet.getColumn(3).width = 15;  // Mã KT
    worksheet.getColumn(4).width = 40;  // Tên tài sản
    worksheet.getColumn(5).width = 30;  // Thông số KT
    worksheet.getColumn(6).width = 12;  // Mã vị trí
    worksheet.getColumn(7).width = 12;  // SL theo sổ
    worksheet.getColumn(8).width = 12;  // SL thực tế
    worksheet.getColumn(9).width = 25;  // Ghi chú
  
    // ====== TIÊU ĐỀ ĐẦU TRANG ======
  
    // Dòng 1
    worksheet.mergeCells("A1:I1");
    const headerRow1 = worksheet.getCell("A1");
    headerRow1.value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP HỒ CHÍ MINH";
    headerRow1.font = { name: "Arial", size: 11, bold: true };
    headerRow1.alignment = { horizontal: "center", vertical: "middle" };
  
    // Dòng 2
    worksheet.mergeCells("A2:I2");
    const headerRow2 = worksheet.getCell("A2");
    headerRow2.value = "Địa chỉ: 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP Hồ Chí Minh";
    headerRow2.font = { name: "Arial", size: 9 };
    headerRow2.alignment = { horizontal: "center", vertical: "middle" };
  
    // Dòng 3: trống
    worksheet.addRow([]);
  
    // Dòng 4: tiêu đề chính theo loại tài sản
    worksheet.mergeCells("A4:I4");
    const titleRow = worksheet.getCell("A4");
  
    const assetType = proposal.assetType;
    let title = "";
  
    switch (assetType) {
      case AssetType.FIXED_ASSET:
        title = "DANH MỤC TÀI SẢN CỐ ĐỊNH ĐỀ XUẤT THANH LÝ";
        break;
      case AssetType.TOOLS_EQUIPMENT:
        title = "DANH MỤC ĐỀ XUẤT THANH LÝ CÔNG CỤ DỤNG CỤ";
        break;
      default:
        title = "DANH MỤC TÀI SẢN ĐỀ XUẤT THANH LÝ";
        break;
    }
  
    titleRow.value = title;
    titleRow.font = {
      name: "Arial",
      size: 12,
      bold: true,
      color: { argb: "FFFF0000" }
    };
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
    const year = new Date().getFullYear();
    yearRow.value = `NĂM ${year}`;
    yearRow.font = { name: "Arial", size: 9, bold: true };
    yearRow.alignment = { horizontal: "center", vertical: "middle" };
  
    // Dòng 7: trống
    worksheet.addRow([]);
  
    // ====== HEADER BẢNG ======
    let headerLabels: string[] = [];
  
    switch (assetType) {
      case AssetType.FIXED_ASSET:
        headerLabels = [
          "STT",
          "MÃ TSCĐ",
          "MÃ KT",
          "TÊN TSCĐ",
          "THÔNG SỐ KỸ THUẬT",
          "MÃ VỊ TRÍ",
          "SL THEO SỔ SÁCH",
          "SL THEO THỰC TẾ",
          "GHI CHÚ",
        ];
        break;
      case AssetType.TOOLS_EQUIPMENT:
        headerLabels = [
          "STT",
          "MÃ CCDC",
          "MÃ KT",
          "TÊN CCDC",
          "THÔNG SỐ KỸ THUẬT",
          "MÃ VỊ TRÍ",
          "SL THEO SỔ SÁCH",
          "SL THEO THỰC TẾ",
          "GHI CHÚ",
        ];
        break;
      default:
        headerLabels = [
          "STT",
          "MÃ TÀI SẢN",
          "MÃ KT",
          "TÊN TÀI SẢN",
          "THÔNG SỐ KỸ THUẬT",
          "MÃ VỊ TRÍ",
          "SL THEO SỔ SÁCH",
          "SL THEO THỰC TẾ",
          "GHI CHÚ",
        ];
        break;
    }
  
    const headerRowTable = worksheet.addRow(headerLabels);
    headerRowTable.height = 30;
  
    // CHỈ DÒNG NÀY: size = 10
    headerRowTable.font = { name: "Arial", size: 10, bold: true };
    headerRowTable.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
    headerRowTable.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }, // nền vàng
    };
  
    headerRowTable.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  
    // ====== DỮ LIỆU BẢNG ======
    const items = proposal.items ?? [];
  
    items.forEach((item, index) => {
      const asset = item.asset;
  
      const row = worksheet.addRow([
        index + 1,
        asset.fixedCode || asset.fixedCode || "",
        asset.ktCode || "",
        asset.name || "",
        asset.specs || "",
        asset.currentRoom?.roomCode || "",
        item.systemQuantity,
        item.countedQuantity,
        item.note || "",
      ]);
  
      // Toàn bộ data: size 9
      row.font = { name: "Arial", size: 9 };
      row.alignment = { vertical: "middle", wrapText: true };
  
      // Căn giữa cho các cột số
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
  
      // Tô viền trong bảng
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });
  
    // Nếu không có dữ liệu
    if (items.length === 0) {
      const noDataRow = worksheet.addRow([
        "", "", "", "KHÔNG CÓ TÀI SẢN NÀO TRONG ĐỀ XUẤT", "", "", "", "", ""
      ]);
      worksheet.mergeCells(`D${noDataRow.number}:F${noDataRow.number}`);
      noDataRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      noDataRow.getCell(4).font = { name: "Arial", size: 9, italic: true };
    }
  
    // ====== PHẦN CHỮ KÝ ======
    const lastDataRow = 8 + Math.max(items.length, 1);
    const signatureRow = lastDataRow + 2;
  
    // Ngày tháng
    worksheet.mergeCells(`A${signatureRow}:I${signatureRow}`);
    const dateCell = worksheet.getCell(`A${signatureRow}`);
    const today = new Date();
    dateCell.value = `Ngày ${today.getDate()} Tháng ${today.getMonth() + 1} Năm ${today.getFullYear()}`;
    dateCell.font = { name: "Arial", size: 9 };
    dateCell.alignment = { horizontal: "right", vertical: "middle" };
  
    // Dòng chức danh ký
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
  
    // ====== XUẤT FILE ======
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
  

  async generateImportTemplate(assetType?: AssetType): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Import Thanh Lý");

    // Thiết lập độ rộng cột
    worksheet.columns = [
      { key: "stt", width: 5 },
      { key: "fixedCode", width: 15 },
      { key: "ktCode", width: 15 },
      { key: "name", width: 40 },
      { key: "specs", width: 30 },
      { key: "roomCode", width: 12 },
      { key: "systemQty", width: 12 },
      { key: "actualQty", width: 12 },
      { key: "note", width: 25 },
    ];

    // Tiêu đề - Dòng 1: TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP HỒ CHÍ MINH
    worksheet.mergeCells("A1:I1");
    const headerRow1 = worksheet.getCell("A1");
    headerRow1.value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP HỒ CHÍ MINH";
    headerRow1.font = { name: "Arial", size: 11, bold: true };
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
    titleRow.value = "TEMPLATE IMPORT DANH MỤC TÀI SẢN THANH LÝ";
    titleRow.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFF0000" } };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 5: Hướng dẫn
    worksheet.mergeCells("A5:I5");
    const instructionRow = worksheet.getCell("A5");
    instructionRow.value = "Vui lòng điền thông tin tài sản cần thanh lý vào các dòng bên dưới";
    instructionRow.font = { name: "Arial", size: 9, italic: true };
    instructionRow.alignment = { horizontal: "center", vertical: "middle" };

    // Dòng 6: Trống
    worksheet.addRow([]);

    // Dòng 7: Header của bảng theo loại tài sản
    let headerLabels = [];
    if (assetType) {
      switch (assetType) {
        case AssetType.FIXED_ASSET:
          headerLabels = [
            "STT",
            "MÃ TSCĐ",
            "MÃ KT",
            "TÊN TSCĐ",
            "THÔNG SỐ KỸ THUẬT",
            "MÃ VỊ TRÍ",
            "SL THEO SỔ SÁCH",
            "SL THEO THỰC TẾ",
            "GHI CHÚ",
          ];
          break;
        case AssetType.TOOLS_EQUIPMENT:
          headerLabels = [
            "STT",
            "MÃ CCDC",
            "MÃ KT",
            "TÊN CCDC",
            "THÔNG SỐ KỸ THUẬT",
            "MÃ VỊ TRÍ",
            "SL THEO SỔ SÁCH",
            "SL THEO THỰC TẾ",
            "GHI CHÚ",
          ];
          break;
        default:
          headerLabels = [
            "STT",
            "MÃ TÀI SẢN",
            "MÃ KT",
            "TÊN TÀI SẢN",
            "THÔNG SỐ KỸ THUẬT",
            "MÃ VỊ TRÍ",
            "SL THEO SỔ SÁCH",
            "SL THEO THỰC TẾ",
            "GHI CHÚ",
          ];
          break;
      }
    } else {
      // Default header cho template chung
      headerLabels = [
        "STT",
        "MÃ TSCĐ/CCDC",
        "MÃ KT",
        "TÊN TSCĐ/CCDC",
        "THÔNG SỐ KỸ THUẬT",
        "MÃ VỊ TRÍ",
        "SL THEO SỔ SÁCH",
        "SL THEO THỰC TẾ",
        "GHI CHÚ",
      ];
    }
    
    const headerRow = worksheet.addRow(headerLabels);

    headerRow.height = 30;
    headerRow.font = { name: "Arial", size: 10, bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }, // Màu vàng
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

    // Thêm dữ liệu mẫu theo loại tài sản
    let sampleRows = [];
    if (assetType === AssetType.TOOLS_EQUIPMENT) {
      sampleRows = [
        [1, "20233404.00001", "24-2238000", "Ổ cứng HDD Toshiba 1.2TB Enterprise AL155C", "Ổ cứng HDD Toshiba 1.2TB Enterprise AL155", "1A00.02A", 3, 1, "Hỏng"],
        [2, "20233407.00002", "24-2238000", "Ổ cứng HDD Toshiba 1.2TB Enterprise AL155C", "Ổ cứng HDD Toshiba 1.2TB Enterprise AL155", "1A00.02A", 1, 1, "Cần thanh lý"],
        [3, "20233408.00003", "24-2238000", "Công cụ dụng cụ khác", "Thiết bị kỹ thuật", "1A00.02A", 2, 0, "Thiếu"],
      ];
    } else {
      sampleRows = [
        [1, "401.04.02239", "16-0953000", "Máy in HP 402D", "Máy in laser đen trắng", "H4.01.01", 1, 1, "Tài sản cần thanh lý"],
        [2, "401.01.03505", "11-0466000", "Máy tính chủ IBM System x3400M3", "Server IBM", "H4.01.01A", 1, 1, "Hết hạn sử dụng"],
        [3, "409.00245", "16-0153000", "Bàn làm việc", "Bàn gỗ công nghiệp", "H4.01.01A", 1, 0, "Bàn bị hỏng"],
      ];
    }

    sampleRows.forEach((rowData) => {
      const row = worksheet.addRow(rowData);
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

    // Thêm ghi chú hướng dẫn
    const noteStartRow = 7 + sampleRows.length + 2;
    
    worksheet.mergeCells(`A${noteStartRow}:I${noteStartRow}`);
    const noteHeader = worksheet.getCell(`A${noteStartRow}`);
    noteHeader.value = "HƯỚNG DẪN SỬ DỤNG:";
    noteHeader.font = { name: "Arial", size: 10, bold: true };
    
    let instructions = [];
    if (assetType === AssetType.TOOLS_EQUIPMENT) {
      instructions = [
        "1. Mã CCDC và Mã KT là bắt buộc và phải chính xác",
        "2. Số lượng theo sổ sách và theo thực tế phải là số nguyên >= 0",
        "3. Tên CCDC, Thông số KT, Mã vị trí chỉ để tham khảo (sẽ được lấy từ hệ thống)",
        "4. Ghi chú có thể để trống hoặc mô tả lý do thanh lý",
        "5. Xóa các dòng mẫu trước khi import dữ liệu thực tế",
      ];
    } else if (assetType === AssetType.FIXED_ASSET) {
      instructions = [
        "1. Mã TSCĐ và Mã KT là bắt buộc và phải chính xác",
        "2. Số lượng theo sổ sách và theo thực tế phải là số nguyên >= 0",
        "3. Tên TSCĐ, Thông số KT, Mã vị trí chỉ để tham khảo (sẽ được lấy từ hệ thống)",
        "4. Ghi chú có thể để trống hoặc mô tả lý do thanh lý",
        "5. Xóa các dòng mẫu trước khi import dữ liệu thực tế",
      ];
    } else {
      instructions = [
        "1. Mã tài sản và Mã KT là bắt buộc và phải chính xác",
        "2. Số lượng theo sổ sách và theo thực tế phải là số nguyên >= 0",
        "3. Tên tài sản, Thông số KT, Mã vị trí chỉ để tham khảo (sẽ được lấy từ hệ thống)",
        "4. Ghi chú có thể để trống hoặc mô tả lý do thanh lý",
        "5. Xóa các dòng mẫu trước khi import dữ liệu thực tế",
      ];
    }

    instructions.forEach((instruction, index) => {
      const row = noteStartRow + index + 1;
      worksheet.mergeCells(`A${row}:I${row}`);
      const cell = worksheet.getCell(`A${row}`);
      cell.value = instruction;
      cell.font = { name: "Arial", size: 9 };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    });

    // Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importFromExcel(
    file: Express.Multer.File,
    unitId: string,
    assetType: AssetType,
    userId: string
  ): Promise<ImportLiquidationResultDto> {
    const result: ImportLiquidationResultDto = {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      message: "",
    };

    try {
      // Validate file trước khi xử lý
      this.validateExcelFile(file);

      // Đọc file Excel
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Chuyển đổi thành JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Tìm hàng bắt đầu dữ liệu (sau header "STT", "MÃ TSCĐ", v.v.)
      let dataStartRow = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row.length > 0 && 
            (row[0]?.toString().toLowerCase().includes('stt') || 
             row[1]?.toString().toLowerCase().includes('mã tscđ') ||
             row[1]?.toString().toLowerCase().includes('mã tscd'))) {
          dataStartRow = i + 1;
          break;
        }
      }

      if (dataStartRow === -1) {
        throw new BadRequestException("Không tìm thấy header trong file Excel. Vui lòng sử dụng template chuẩn.");
      }

      // Lấy dữ liệu từ hàng bắt đầu
      const dataRows = jsonData.slice(dataStartRow);
      
      // Lọc bỏ các hàng trống
      const nonEmptyRows = dataRows.filter(row => {
        const rowArray = row as any[];
        return rowArray && rowArray.length > 0 && rowArray.some(cell => cell !== null && cell !== undefined && cell !== '');
      });

      result.totalProcessed = nonEmptyRows.length;

      if (nonEmptyRows.length === 0) {
        throw new BadRequestException("File Excel không có dữ liệu tài sản hợp lệ");
      }

      const validItems = [];
      const errors = [];
      const tempItems = []; // Để kiểm tra duplicate

      // Xử lý từng hàng
      for (let i = 0; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i] as any[];
        const rowNumber = dataStartRow + i + 1;

        try {
          // Mapping dữ liệu theo format xuất Excel:
          // [STT, MÃ TSCĐ, MÃ KT, TÊN TSCĐ, THÔNG SỐ KỸ THUẬT, MÃ VỊ TRÍ, SL THEO SỔ SÁCH, SL THEO THỰC TẾ, GHI CHÚ]
          const fixedCode = row[1]?.toString().trim();
          const ktCode = row[2]?.toString().trim();
          const note = row[8]?.toString().trim() || '';

          // Validation cơ bản
          if (!fixedCode) {
            errors.push(`Dòng ${rowNumber}: Mã TSCĐ không được để trống`);
            continue;
          }

          if (!ktCode) {
            errors.push(`Dòng ${rowNumber}: Mã KT không được để trống`);
            continue;
          }

          // Parse và validate quantities
          const systemQuantityResult = this.parseQuantity(row[6], "Số lượng theo sổ sách", rowNumber);
          const countedQuantityResult = this.parseQuantity(row[7], "Số lượng theo thực tế", rowNumber);

          if (systemQuantityResult.error) {
            errors.push(systemQuantityResult.error);
            continue;
          }

          if (countedQuantityResult.error) {
            errors.push(countedQuantityResult.error);
            continue;
          }

          // Thêm vào danh sách tạm để kiểm tra duplicate
          tempItems.push({ fixedCode, ktCode });

          // Tìm và validate asset
          const assetResult = await this.findAndValidateAsset(fixedCode, ktCode, unitId, rowNumber);
          
          if (assetResult.errors.length > 0) {
            errors.push(...assetResult.errors);
            continue;
          }

          validItems.push({
            assetId: assetResult.asset.id,
            systemQuantity: systemQuantityResult.quantity,
            countedQuantity: countedQuantityResult.quantity,
            note,
          });

        } catch (error) {
          errors.push(`Dòng ${rowNumber}: Lỗi xử lý - ${error.message}`);
        }
      }

      // Kiểm tra duplicate trong file
      const duplicateErrors = this.checkDuplicatesInImport(tempItems);
      errors.push(...duplicateErrors);

      result.errorCount = errors.length;
      result.errors = errors;
      result.successCount = validItems.length;

      if (validItems.length === 0) {
        result.message = "Không có tài sản hợp lệ nào để tạo đề xuất thanh lý";
        return result;
      }

      // Tạo đề xuất thanh lý với các items hợp lệ
      const createDto = {
        unitId,
        assetType,
        status: LiquidationStatus.DRAFT,
        items: validItems
      };

      const proposal = await this.createProposal(createDto, userId);
      result.liquidationProposalId = proposal.id;
      result.message = `Import thành công ${validItems.length}/${result.totalProcessed} tài sản. Đề xuất thanh lý đã được tạo với ID: ${proposal.id}`;

      return result;

    } catch (error) {
      result.errors.push(`Lỗi xử lý file: ${error.message}`);
      result.errorCount = result.errors.length;
      result.message = `Import thất bại: ${error.message}`;
      throw new BadRequestException(`Import thất bại: ${error.message}`);
    }
  }

  /**
   * Validate Excel file format và structure
   */
  private validateExcelFile(file: Express.Multer.File): void {
    const allowedMimeTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("File phải có định dạng Excel (.xls, .xlsx)");
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new BadRequestException("File không được vượt quá 10MB");
    }
  }

  /**
   * Tìm và validate asset theo fixedCode và ktCode
   */
  private async findAndValidateAsset(
    fixedCode: string,
    ktCode: string,
    unitId: string,
    rowNumber: number
  ): Promise<{ asset: Asset; errors: string[] }> {
    const errors: string[] = [];

    // Tìm asset theo fixedCode và ktCode
    const asset = await this.assetRepo.findOne({
      where: { 
        fixedCode: fixedCode,
        ktCode: ktCode
      }
    });

    if (!asset) {
      errors.push(`Dòng ${rowNumber}: Không tìm thấy tài sản với mã TSCĐ "${fixedCode}" và mã KT "${ktCode}"`);
      return { asset: null, errors };
    }

    // Kiểm tra asset có thuộc đơn vị này không
    const assetBookItem = await this.assetBookItemRepo.findOne({
      where: {
        assetId: asset.id,
        book: { unitId: unitId }
      },
      relations: ["book"],
      order: { assignedAt: "DESC" }
    });

    if (!assetBookItem) {
      errors.push(`Dòng ${rowNumber}: Tài sản "${fixedCode}" không thuộc về đơn vị này`);
      return { asset: null, errors };
    }

    // Kiểm tra trạng thái asset có thể thanh lý không
    if (asset.status === AssetStatus.LIQUIDATED) {
      errors.push(`Dòng ${rowNumber}: Tài sản "${fixedCode}" đã được thanh lý trước đó`);
      return { asset: null, errors };
    }

    if (asset.status === AssetStatus.LOST) {
      errors.push(`Dòng ${rowNumber}: Tài sản "${fixedCode}" đã được báo mất, không thể thanh lý`);
      return { asset: null, errors };
    }

    return { asset, errors };
  }

  /**
   * Parse và validate quantity từ Excel cell
   */
  private parseQuantity(value: any, fieldName: string, rowNumber: number): { quantity: number; error?: string } {
    if (value === null || value === undefined || value === '') {
      return { quantity: 0, error: `Dòng ${rowNumber}: ${fieldName} không được để trống` };
    }

    const quantity = parseInt(value.toString());
    
    if (isNaN(quantity) || quantity < 0) {
      return { quantity: 0, error: `Dòng ${rowNumber}: ${fieldName} phải là số nguyên >= 0` };
    }

    return { quantity };
  }

  /**
   * Kiểm tra duplicates trong cùng một file import
   */
  private checkDuplicatesInImport(items: any[]): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();

    items.forEach((item, index) => {
      const key = `${item.fixedCode}-${item.ktCode}`;
      if (seen.has(key)) {
        errors.push(`Dòng ${index + 1}: Tài sản "${item.fixedCode}" bị trùng lặp trong file import`);
      } else {
        seen.add(key);
      }
    });

    return errors;
  }
}
