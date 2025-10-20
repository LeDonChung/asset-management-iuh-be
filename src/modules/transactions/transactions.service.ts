import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetTransaction } from 'src/entities/asset-transaction.entity';
import { AssetTransactionItem } from 'src/entities/asset-transaction-item.entity';
import { AssetTransactionHistory } from 'src/entities/asset-transaction-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto, UpdateTransactionStatusDto, ProposeTransactionDto, ApproveTransactionDto, RejectTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/filter-transaction.dto';
import { TransactionResponseDto, SimplifiedTransactionResponseDto } from './dto/response-transaction.dto';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { TransactionType } from 'src/common/shared/TransactionType';
import { AssetStatus } from 'src/common/shared/AssetStatus';
import { AssetBookItemStatus } from 'src/common/shared/AssetBookItemStatus';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { FilterUtil } from 'src/common/utils/filter.util';
import { FieldType } from 'src/common/dto/filter.dto';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { User } from 'src/entities/user.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(AssetTransaction)
    private transactionRepo: Repository<AssetTransaction>,
    @InjectRepository(AssetTransactionItem)
    private transactionItemRepo: Repository<AssetTransactionItem>,
    @InjectRepository(AssetTransactionHistory)
    private transactionHistoryRepo: Repository<AssetTransactionHistory>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(AssetBook)
    private assetBookRepo: Repository<AssetBook>,
    @InjectRepository(AssetBookItem)
    private assetBookItemRepo: Repository<AssetBookItem>,
    private permissionHelper: PermissionHelperService,
  ) {}

  async createTransaction(
    createDto: CreateTransactionDto,
    requesterId: string,
  ): Promise<TransactionResponseDto> {
    // Validate assets exist and are available for transfer
    const assetIds = createDto.items.map(item => item.assetId);
    const assets = await this.assetRepo.findByIds(assetIds);
    
    if (assets.length !== assetIds.length) {
      throw new BadRequestException('Một số tài sản không tồn tại');
    }

    // Check if assets are in valid state for transfer
    const invalidAssets = assets.filter(asset => 
      ![AssetStatus.IN_USE].includes(asset.status)
    );
    
    if (invalidAssets.length > 0) {
      throw new BadRequestException(
        `Một số tài sản không ở trạng thái hợp lệ để bàn giao: ${invalidAssets.map(a => a.name).join(', ')}`
      );
    }

    // Validate fromUnitId and toUnitId are provided
    if (!createDto.fromUnitId || !createDto.toUnitId) {
      throw new BadRequestException('Phải chỉ định đơn vị nguồn và đơn vị đích');
    }

    // For INTERNAL_MOVE, fromUnitId must equal toUnitId
    if (createDto.type === TransactionType.INTERNAL_MOVE) {
      if (createDto.fromUnitId !== createDto.toUnitId) {
        throw new BadRequestException('Di chuyển nội bộ phải trong cùng một đơn vị');
      }
    } else if (createDto.type === TransactionType.TRANSFER) {
      // For TRANSFER, fromUnitId must be different from toUnitId
      if (createDto.fromUnitId === createDto.toUnitId) {
        throw new BadRequestException('Bàn giao phải giữa các đơn vị khác nhau');
      }
    }

    // Validate that assets belong to fromUnit by checking current asset books
    if (createDto.fromUnitId) {
      const currentYear = new Date().getFullYear();
      const fromAssetBook = await this.findOrCreateAssetBook(createDto.fromUnitId, currentYear);
      
      const assetBookItems = await this.assetBookItemRepo
        .createQueryBuilder('item')
        .where('item.bookId = :bookId', { bookId: fromAssetBook.id })
        .andWhere('item.assetId IN (:...assetIds)', { assetIds })
        .andWhere('item.status = :status', { status: AssetBookItemStatus.IN_USE })
        .getMany();

      if (assetBookItems.length !== assetIds.length) {
        throw new BadRequestException(
          'Một số tài sản không thuộc sổ tài sản của đơn vị nguồn hoặc không ở trạng thái IN_USE'
        );
      }
    }

    // Determine initial status based on transaction type
    let initialStatus = createDto.status || TransactionStatus.DRAFT;
    
    // INTERNAL_MOVE doesn't need approval - set to APPROVED immediately
    if (createDto.type === TransactionType.INTERNAL_MOVE) {
      initialStatus = TransactionStatus.APPROVED;
    }

    // Create transaction
    const transaction = this.transactionRepo.create({
      type: createDto.type,
      fromUnitId: createDto.fromUnitId,
      toUnitId: createDto.toUnitId,
      requesterId,
      requestNote: createDto.requestNote,
      status: initialStatus,
      approverId: createDto.type === TransactionType.INTERNAL_MOVE ? requesterId : undefined,
      approvalNote: createDto.type === TransactionType.INTERNAL_MOVE ? 'Tự động phê duyệt cho di chuyển nội bộ' : undefined,
    });

    const savedTransaction = await this.transactionRepo.save(transaction);

    // Create transaction items
    const items = createDto.items.map(item =>
      this.transactionItemRepo.create({
        transactionId: savedTransaction.id,
        assetId: item.assetId,
        fromRoomId: item.fromRoomId,
        toRoomId: item.toRoomId,
        note: item.note,
      })
    );

    await this.transactionItemRepo.save(items);

    // Handle different transaction types
    if (createDto.type === TransactionType.INTERNAL_MOVE) {
      // For INTERNAL_MOVE: execute immediately (already APPROVED)
      // Pass items from DTO instead of transaction.items (which is not loaded)
      await this.handleApprovedInternalMove(savedTransaction, assets, requesterId, createDto.items);
      
      // Create history for INTERNAL_MOVE (DRAFT -> APPROVED)
      await this.createTransactionHistory(
        savedTransaction.id,
        TransactionStatus.DRAFT,
        TransactionStatus.APPROVED,
        requesterId,
        'Di chuyển nội bộ được tự động phê duyệt và thực hiện'
      );
    } else {
      // For TRANSFER: create history record
      await this.createTransactionHistory(
        savedTransaction.id,
        TransactionStatus.DRAFT,
        initialStatus,
        requesterId,
        `Tạo giao dịch ${createDto.type}: ${createDto.requestNote || ''}`
      );
    }

    return this.getTransactionById(savedTransaction.id);
  }

  async findAllSimplified(
    filterDto: TransactionFilterDto,
    currentUser: User,
  ): Promise<PaginatedResponseDto<SimplifiedTransactionResponseDto>> {
    try {
      const config = {
        searchFields: [
          'requestNote',
          'fromUnit.name',
          'toUnit.name',
          'requester.fullName',
        ],
        fieldTypeMap: {
          type: FieldType.SELECT,
          status: FieldType.SELECT,
          createdAt: FieldType.DATE,
          updatedAt: FieldType.DATE,
        },
        defaultSorting: { field: 'createdAt', direction: 'DESC' as const },
        relations: ['fromUnit', 'toUnit', 'requester', 'items'],
      };

      // Tạo filter permission-based cho fromUnitId
      const unitAccessFilter = await this.permissionHelper.createUnitAccessFilter(currentUser, "fromUnitId");

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
            TransactionStatus.PROPOSED,
            TransactionStatus.APPROVED,
            TransactionStatus.REJECTED,
          ],
        });
      }

      if (filterDto.type) {
        quickFilterConditions.push({
          field: 'type',
          fieldType: 'select',
          operator: 'equals',
          value: [filterDto.type],
        });
      }

      if (filterDto.status) {
        quickFilterConditions.push({
          field: 'status',
          fieldType: 'select',
          operator: 'equals',
          value: [filterDto.status],
        });
      }

      if (filterDto.fromUnitId) {
        // Kiểm tra xem user có quyền xem unit này không
        const accessibleUnitIds =
          await this.permissionHelper.getAccessibleUnitIds(currentUser);
        if (accessibleUnitIds.includes(filterDto.fromUnitId)) {
          quickFilterConditions.push({
            field: "fromUnitId",
            fieldType: "select",
            operator: "equals",
            value: [filterDto.fromUnitId],
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

      // Merge with existing conditions
      filterDto.conditions = [
        ...(filterDto.conditions || []),
        ...quickFilterConditions,
      ];

      return FilterUtil.getFilteredResults(
        this.transactionRepo,
        filterDto,
        SimplifiedTransactionResponseDto,
        config,
        'transaction',
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async getTransactionById(id: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: [
        'fromUnit',
        'toUnit',
        'requester',
        'approver',
        'handover',
        'receiver',
        'items.asset',
        'items.asset.currentRoom',
        'items.fromRoom',
        'items.toRoom',
        'histories.changer',
      ],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return transaction as any;
  }

  async updateTransaction(
    id: string,
    updateDto: UpdateTransactionDto
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể cập nhật giao dịch ở trạng thái nháp (DRAFT)'
      );
    }

    // Update transaction fields
    Object.assign(transaction, updateDto);
    await this.transactionRepo.save(transaction);

    // Update items if provided
    if (updateDto.items && updateDto.items.length > 0) {
      await this.transactionItemRepo.delete({ transactionId: id });
      
      const newItems = updateDto.items.map(item =>
        this.transactionItemRepo.create({
          transactionId: id,
          assetId: item.assetId,
          fromRoomId: item.fromRoomId,
          toRoomId: item.toRoomId,
          note: item.note,
        })
      );
      
      await this.transactionItemRepo.save(newItems);
    }

    return this.getTransactionById(id);
  }

  async proposeTransaction(
    id: string,
    proposeDto: ProposeTransactionDto,
    requesterId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items.asset'],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể gửi đề xuất cho giao dịch ở trạng thái nháp'
      );
    }

    const oldStatus = transaction.status;
    transaction.status = TransactionStatus.PROPOSED;
    await this.transactionRepo.save(transaction);

    // For PROPOSED status, assets remain IN_USE but transaction is pending approval
    // No asset status changes needed until APPROVED

    // Create history record
    await this.createTransactionHistory(
      id,
      oldStatus,
      TransactionStatus.PROPOSED,
      requesterId,
      proposeDto.note || 'Giao dịch được đề xuất và chờ phê duyệt'
    );

    return this.getTransactionById(id);
  }

  async approveTransaction(
    id: string,
    approveDto: ApproveTransactionDto,
    approverId: string,
  ): Promise<TransactionResponseDto> {
    return this.updateTransactionStatus(
      id,
      TransactionStatus.APPROVED,
      approverId,
      approveDto.approvalNote || 'Giao dịch được phê duyệt',
      { approverId }
    );
  }

  async rejectTransaction(
    id: string,
    rejectDto: RejectTransactionDto,
    approverId: string,
  ): Promise<TransactionResponseDto> {
    return this.updateTransactionStatus(
      id,
      TransactionStatus.REJECTED,
      approverId,
      rejectDto.rejectionReason,
      { rejectionReason: rejectDto.rejectionReason }
    );
  }

  async updateTransactionStatus(
    id: string,
    newStatus: TransactionStatus,
    updaterId: string,
    note: string,
    additionalFields: Partial<AssetTransaction> = {},
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items.asset'],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    this.validateStatusTransition(transaction.status, newStatus);

    const oldStatus = transaction.status;

    // Update transaction
    Object.assign(transaction, { status: newStatus, ...additionalFields });
    await this.transactionRepo.save(transaction);

    // Update asset status and asset books based on new transaction status
    const assets = transaction.items.map(item => item.asset);

    switch (newStatus) {
      case TransactionStatus.APPROVED:
        // Khi chấp nhận: cập nhật tài sản và sổ tài sản
        await this.handleApprovedTransaction(transaction, assets, updaterId, note);
        break;
      case TransactionStatus.REJECTED:
        // Khi từ chối: không thay đổi gì, chỉ ghi lại lịch sử
        await this.handleRejectedTransaction(id, oldStatus, newStatus, updaterId, note);
        break;
      default:
        // Cho PROPOSED: chỉ tạo history
        await this.createTransactionHistory(id, oldStatus, newStatus, updaterId, note);
    }

    return this.getTransactionById(id);
  }

  private async handleApprovedInternalMove(
    transaction: AssetTransaction,
    assets: Asset[],
    requesterId: string,
    transactionItems: { assetId: string; fromRoomId?: string; toRoomId?: string; note?: string }[],
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    // 1. Cập nhật vị trí tài sản - chỉ cập nhật currentRoomId
    for (const asset of assets) {
      const item = transactionItems.find(i => i.assetId === asset.id);
      if (item?.toRoomId) {
        await this.assetRepo.update(asset.id, { 
          currentRoomId: item.toRoomId
        });
      }
    }

    // 2. Cập nhật roomId trong sổ tài sản (cùng đơn vị, chỉ đổi phòng)
    const assetBook = await this.findOrCreateAssetBook(transaction.fromUnitId, currentYear);
    
    for (const asset of assets) {
      const item = transactionItems.find(i => i.assetId === asset.id);
      if (item?.toRoomId) {
        await this.assetBookItemRepo.update(
          { 
            bookId: assetBook.id,
            assetId: asset.id 
          },
          { 
            roomId: item.toRoomId,
            note: `Di chuyển nội bộ từ giao dịch ${transaction.id}`
          }
        );
      }
    }

    // Lịch sử sẽ được tạo bởi handleApprovedTransaction
  }

  private async handleApprovedTransaction(
    transaction: AssetTransaction,
    assets: Asset[],
    updaterId: string,
    note: string,
  ): Promise<void> {
    // Phân biệt xử lý theo loại transaction
    if (transaction.type === TransactionType.INTERNAL_MOVE) {
      // Nếu là INTERNAL_MOVE, load transaction items để có data
      const transactionWithItems = await this.transactionRepo.findOne({
        where: { id: transaction.id },
        relations: ['items']
      });
      if (transactionWithItems?.items) {
        const itemsData = transactionWithItems.items.map(item => ({
          assetId: item.assetId,
          fromRoomId: item.fromRoomId,
          toRoomId: item.toRoomId,
          note: item.note
        }));
        await this.handleApprovedInternalMove(transaction, assets, updaterId, itemsData);
      }
    } else if (transaction.type === TransactionType.TRANSFER) {
      // Nếu là TRANSFER, xử lý bàn giao giữa đơn vị
      await this.handleApprovedTransfer(transaction, assets, updaterId, note);
    }

    // Tạo lịch sử thay đổi trạng thái giao dịch
    await this.createTransactionHistory(
      transaction.id,
      TransactionStatus.PROPOSED, // oldStatus
      TransactionStatus.APPROVED, // newStatus
      updaterId,
      note
    );
  }

  private async handleApprovedTransfer(
    transaction: AssetTransaction,
    assets: Asset[],
    updaterId: string,
    note: string,
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    // 1. Cập nhật vị trí tài sản - chỉ cập nhật vị trí, không thay đổi status
    for (const asset of assets) {
      const item = transaction.items.find(i => i.assetId === asset.id);
      await this.assetRepo.update(asset.id, { 
        currentRoomId: item?.toRoomId
        // Không cập nhật status của tài sản
      });
    }

    // 2. Cập nhật trạng thái trong sổ cũ thành TRANSFERRED
    if (transaction.fromUnitId) {
      const oldAssetBook = await this.findOrCreateAssetBook(transaction.fromUnitId, currentYear);
      
      for (const asset of assets) {
        await this.assetBookItemRepo.update(
          { 
            bookId: oldAssetBook.id,
            assetId: asset.id 
          },
          { status: AssetBookItemStatus.TRANSFERRED }
        );
      }
    }

    // 3. Tạo mới trong sổ đơn vị nhận
    const newAssetBook = await this.findOrCreateAssetBook(transaction.toUnitId, currentYear);
    
    const newAssetBookItems = assets.map(asset => {
      const item = transaction.items.find(i => i.assetId === asset.id);
      return this.assetBookItemRepo.create({
        bookId: newAssetBook.id,
        assetId: asset.id,
        roomId: item?.toRoomId,
        assignedAt: new Date(),
        quantity: 1, // Mặc định là 1 cho tài sản cố định
        status: AssetBookItemStatus.IN_USE,
        note: `Bàn giao từ giao dịch ${transaction.id}`
      });
    });

    await this.assetBookItemRepo.save(newAssetBookItems);

    // Lịch sử sẽ được tạo bởi handleApprovedTransaction
  }

  private async handleRejectedTransaction(
    transactionId: string,
    oldStatus: TransactionStatus,
    newStatus: TransactionStatus,
    updaterId: string,
    note: string,
  ): Promise<void> {
    // For rejected transactions, assets remain in their current state
    // No changes needed to asset status or location
    // Just create history record
    await this.createTransactionHistory(
      transactionId,
      oldStatus,
      newStatus,
      updaterId,
      `Giao dịch bị từ chối: ${note}`
    );
  }

  private async createTransactionHistory(
    transactionId: string,
    oldStatus: TransactionStatus,
    newStatus: TransactionStatus,
    changedBy: string,
    note: string,
  ): Promise<void> {
    const history = this.transactionHistoryRepo.create({
      transactionId,
      oldStatus,
      newStatus,
      changedBy,
      note,
    });

    await this.transactionHistoryRepo.save(history);
  }



  private async findOrCreateAssetBook(unitId: string, year: number): Promise<AssetBook> {
    let assetBook = await this.assetBookRepo.findOne({
      where: { unitId, year }
    });

    if (!assetBook) {
      assetBook = this.assetBookRepo.create({
        unitId,
        year,
        status: 'OPEN' as any // AssetBookStatus.OPEN
      });
      assetBook = await this.assetBookRepo.save(assetBook);
    }

    return assetBook;
  }

  private validateStatusTransition(
    currentStatus: TransactionStatus,
    newStatus: TransactionStatus,
  ): void {
    const validTransitions = {
      [TransactionStatus.DRAFT]: [TransactionStatus.PROPOSED],
      [TransactionStatus.PROPOSED]: [TransactionStatus.APPROVED, TransactionStatus.REJECTED],
      [TransactionStatus.APPROVED]: [TransactionStatus.REJECTED], // Chỉ có thể từ chối sau khi đã chấp nhận
      [TransactionStatus.REJECTED]: [], // Không thể chuyển trạng thái sau khi đã từ chối
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${currentStatus} sang ${newStatus}`
      );
    }
  }
}
