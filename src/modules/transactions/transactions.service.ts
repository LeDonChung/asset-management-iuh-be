import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { AssetTransaction } from 'src/entities/asset-transaction.entity';
import { AssetTransactionItem } from 'src/entities/asset-transaction-item.entity';
import { AssetTransactionHistory } from 'src/entities/asset-transaction-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { Room } from 'src/entities/room.entity';
import { Unit } from 'src/entities/unit.entity';
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
import { AccessScopeType } from 'src/entities/access-scope.entity';

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
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>,
    private permissionHelper: PermissionHelperService,
  ) {}

  async createTransaction(
    createDto: CreateTransactionDto,
    requesterId: string,
  ): Promise<TransactionResponseDto> {
    const assetIds = createDto.items.map(item => item.assetId);
    const assets = await this.assetRepo.findByIds(assetIds);
    
    if (assets.length !== assetIds.length) {
      throw new BadRequestException('Một số tài sản không tồn tại');
    }

    const invalidAssets = assets.filter(asset => 
      ![AssetStatus.IN_USE].includes(asset.status)
    );
    
    if (invalidAssets.length > 0) {
      throw new BadRequestException(
        `Một số tài sản không ở trạng thái hợp lệ để bàn giao: ${invalidAssets.map(a => a.name).join(', ')}`
      );
    }

    if (createDto.fromUnitId === createDto.toUnitId) {
      throw new BadRequestException('Đơn vị bàn giao và đơn vị tiếp nhận phải khác nhau');
    }

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

    const warehouseRoom = await this.findUnitWarehouseRoom(createDto.toUnitId);
    if (!warehouseRoom) {
      throw new BadRequestException('Không tìm thấy phòng kho mặc định cho đơn vị đích');
    }

    const transaction = this.transactionRepo.create({
      type: TransactionType.TRANSFER,
      fromUnitId: createDto.fromUnitId,
      toUnitId: createDto.toUnitId,
      requesterId,
      requestNote: createDto.requestNote,
      status: createDto.status || TransactionStatus.DRAFT,
    });

    const savedTransaction = await this.transactionRepo.save(transaction);

    const items = createDto.items.map(item =>
      this.transactionItemRepo.create({
        transactionId: savedTransaction.id,
        assetId: item.assetId,
        fromRoomId: item.fromRoomId,
        toRoomId: warehouseRoom.id,
        note: item.note,
      })
    );

    await this.transactionItemRepo.save(items);

    const statusText = createDto.status === TransactionStatus.PROPOSED ? 'đề xuất' : 'nháp';
    await this.createTransactionHistory(
      savedTransaction.id,
      TransactionStatus.DRAFT,
      createDto.status || TransactionStatus.DRAFT,
      requesterId,
      `Tạo giao dịch bàn giao ${statusText}: ${createDto.requestNote || ''}`
    );

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

      if (this.permissionHelper.isAdmin(currentUser)) {
        const quickFilterConditions: any[] = [];
        
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
          quickFilterConditions.push({
            field: "fromUnitId",
            fieldType: "select",
            operator: "equals",
            value: [filterDto.fromUnitId],
          });
        }

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
      }

      else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
        
        if (accessibleUnitIds.length === 0) {
          return new PaginatedResponseDto([], {
            page: 1,
            limit: filterDto.pagination?.itemsPerPage || 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          });
        }

        const queryBuilder = this.transactionRepo
          .createQueryBuilder('transaction')
          .leftJoinAndSelect('transaction.fromUnit', 'fromUnit')
          .leftJoinAndSelect('transaction.toUnit', 'toUnit')
          .leftJoinAndSelect('transaction.requester', 'requester')
          .leftJoinAndSelect('transaction.items', 'items')
          .where('(transaction.fromUnitId IN (:...accessibleUnitIds) OR transaction.toUnitId IN (:...accessibleUnitIds))', { 
            accessibleUnitIds 
          })
          .andWhere('transaction.status IN (:...allowedStatuses)', {
            allowedStatuses: [
              TransactionStatus.PROPOSED,
              TransactionStatus.APPROVED,
              TransactionStatus.REJECTED,
              TransactionStatus.RECEIVED,
            ]
          });

        if (filterDto.type) {
          queryBuilder.andWhere('transaction.type = :type', { type: filterDto.type });
        }

        if (filterDto.status) {
          queryBuilder.andWhere('transaction.status = :status', { status: filterDto.status });
        }

        if (filterDto.fromUnitId) {
          if (accessibleUnitIds.includes(filterDto.fromUnitId)) {
            queryBuilder.andWhere('transaction.fromUnitId = :fromUnitId', { fromUnitId: filterDto.fromUnitId });
          } else {
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

        if (filterDto.search) {
          queryBuilder.andWhere(
            '(transaction.requestNote LIKE :search OR fromUnit.name LIKE :search OR toUnit.name LIKE :search OR requester.fullName LIKE :search)',
            { search: `%${filterDto.search}%` }
          );
        }

        queryBuilder.orderBy('transaction.createdAt', 'DESC');

        const page = filterDto.pagination?.currentPage || 1;
        const limit = filterDto.pagination?.itemsPerPage || 5;
        const offset = (page - 1) * limit;

        const [results, total] = await queryBuilder
          .skip(offset)
          .take(limit)
          .getManyAndCount();

        const totalPages = Math.ceil(total / limit);

        const transformedData = plainToInstance(SimplifiedTransactionResponseDto, results, {
          excludeExtraneousValues: true,
        });

        return new PaginatedResponseDto(
          transformedData,
          {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        );
      }

      else if (this.permissionHelper.isUserDeptUser(currentUser)) {
        if (!currentUser.unitId) {
          return new PaginatedResponseDto([], {
            page: 1,
            limit: filterDto.pagination?.itemsPerPage || 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          });
        }

        const queryBuilder = this.transactionRepo
          .createQueryBuilder('transaction')
          .leftJoinAndSelect('transaction.fromUnit', 'fromUnit')
          .leftJoinAndSelect('transaction.toUnit', 'toUnit')
          .leftJoinAndSelect('transaction.requester', 'requester')
          .leftJoinAndSelect('transaction.items', 'items')
          .where('(transaction.fromUnitId = :userUnitId)', { userUnitId: currentUser.unitId })
          .orWhere('(transaction.toUnitId = :userUnitId AND transaction.status IN (:...approvedStatuses))', {
            userUnitId: currentUser.unitId,
            approvedStatuses: [TransactionStatus.APPROVED, TransactionStatus.RECEIVED, TransactionStatus.REJECTED],
          });

        if (filterDto.type) {
          queryBuilder.andWhere('transaction.type = :type', { type: filterDto.type });
        }

        if (filterDto.status) {
          queryBuilder.andWhere('transaction.status = :status', { status: filterDto.status });
        }

        if (filterDto.fromUnitId) {
          if (filterDto.fromUnitId === currentUser.unitId) {
            queryBuilder.andWhere('transaction.fromUnitId = :fromUnitId', { fromUnitId: filterDto.fromUnitId });
          } else {
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

        if (filterDto.search) {
          queryBuilder.andWhere(
            '(transaction.requestNote LIKE :search OR fromUnit.name LIKE :search OR toUnit.name LIKE :search OR requester.fullName LIKE :search)',
            { search: `%${filterDto.search}%` }
          );
        }

        queryBuilder.orderBy('transaction.createdAt', 'DESC');

        const page = filterDto.pagination?.currentPage || 1;
        const limit = filterDto.pagination?.itemsPerPage || 5;
        const offset = (page - 1) * limit;

        const [results, total] = await queryBuilder
          .skip(offset)
          .take(limit)
          .getManyAndCount();

        const totalPages = Math.ceil(total / limit);

        const transformedData = plainToInstance(SimplifiedTransactionResponseDto, results, {
          excludeExtraneousValues: true,
        });

        return new PaginatedResponseDto(
          transformedData,
          {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        );
      }

      else {
        return new PaginatedResponseDto([], {
          page: 1,
          limit: filterDto.pagination?.itemsPerPage || 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (e) {
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

    Object.assign(transaction, updateDto);
    await this.transactionRepo.save(transaction);

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
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items.asset'],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.status !== TransactionStatus.PROPOSED) {
      throw new BadRequestException('Chỉ có thể phê duyệt giao dịch ở trạng thái đề xuất');
    }

    const oldStatus = transaction.status;
    transaction.status = TransactionStatus.APPROVED;
    transaction.approverId = approverId;
    await this.transactionRepo.save(transaction);

    const history = this.transactionHistoryRepo.create({
      transactionId: id,
      oldStatus,
      newStatus: TransactionStatus.APPROVED,
      changedBy: approverId,
      note: `Giao dịch đã được phê duyệt. ${approveDto.approvalNote || ''}`,
      evidenceUrl: approveDto.evidenceUrl,
    });

    await this.transactionHistoryRepo.save(history);

    return this.getTransactionById(id);
  }

  async rejectTransaction(
    id: string,
    rejectDto: RejectTransactionDto,
    approverId: string,
  ): Promise<TransactionResponseDto> {
    if (!rejectDto.rejectionReason || rejectDto.rejectionReason.trim() === '') {
      throw new BadRequestException('Lý do từ chối là bắt buộc');
    }
    
    return this.updateTransactionStatus(
      id,
      TransactionStatus.REJECTED,
      approverId,
      `Giao dịch đã bị từ chối. Lý do: ${rejectDto.rejectionReason}`,
      { rejectionReason: rejectDto.rejectionReason }
    );
  }

  async receiveTransaction(
    id: string,
    receiverId: string,
    note?: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['toUnit', 'items.asset'],
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.status !== TransactionStatus.APPROVED) {
      throw new BadRequestException('Chỉ có thể tiếp nhận giao dịch đã được phê duyệt');
    }

    const warehouseRoom = await this.findUnitWarehouseRoom(transaction.toUnitId);
    if (!warehouseRoom) {
      throw new BadRequestException('Không tìm thấy phòng kho mặc định của đơn vị đích');
    }

    const warehouseInfo = `kho ${warehouseRoom.name} của ${transaction.toUnit.name}`;

    await this.handleAssetTransferOnReceive(transaction, warehouseRoom.id);

    return this.updateTransactionStatus(
      id,
      TransactionStatus.RECEIVED,
      receiverId,
      `Đơn vị đích đã tiếp nhận tài sản. Tài sản đã được chuyển về ${warehouseInfo}. ${note || ''}`,
      { receiverId }
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

    Object.assign(transaction, { status: newStatus, ...additionalFields });
    await this.transactionRepo.save(transaction);

    const assets = transaction.items.map(item => item.asset);

    switch (newStatus) {
      case TransactionStatus.APPROVED:
        await this.createTransactionHistory(id, oldStatus, newStatus, updaterId, note);
        break;
      case TransactionStatus.RECEIVED:
        await this.createTransactionHistory(id, oldStatus, newStatus, updaterId, note);
        break;
      case TransactionStatus.REJECTED:
        await this.handleRejectedTransaction(id, oldStatus, newStatus, updaterId, note);
        break;
      default:
        await this.createTransactionHistory(id, oldStatus, newStatus, updaterId, note);
    }

    return this.getTransactionById(id);
  }

  private async handleRejectedTransaction(
    transactionId: string,
    oldStatus: TransactionStatus,
    newStatus: TransactionStatus,
    updaterId: string,
    note: string,
  ): Promise<void> {
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
        status: 'OPEN' as any
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
      [TransactionStatus.APPROVED]: [TransactionStatus.RECEIVED, TransactionStatus.REJECTED],
      [TransactionStatus.RECEIVED]: [],
      [TransactionStatus.REJECTED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${currentStatus} sang ${newStatus}`
      );
    }
  }

  private async findUnitWarehouseRoom(unitId: string): Promise<Room | null> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId } });
    if (!unit) {
      return null;
    }

    const warehouseRoom = await this.roomRepo.findOne({
      where: {
        unitId: unitId,
        name: "Kho",
        building: "INVENTORY"
      },
      relations: ['unit']
    });

    return warehouseRoom;
  }

  private async handleAssetTransferOnReceive(
    transaction: AssetTransaction,
    warehouseRoomId: string,
  ): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    const fromAssetBook = await this.findOrCreateAssetBook(transaction.fromUnitId, currentYear);
    const toAssetBook = await this.findOrCreateAssetBook(transaction.toUnitId, currentYear);

    for (const item of transaction.items) {
      await this.assetBookItemRepo
        .createQueryBuilder()
        .update(AssetBookItem)
        .set({ status: AssetBookItemStatus.TRANSFERRED })
        .where('bookId = :bookId', { bookId: fromAssetBook.id })
        .andWhere('assetId = :assetId', { assetId: item.assetId })
        .andWhere('status = :currentStatus', { currentStatus: AssetBookItemStatus.IN_USE })
        .execute();

      const newAssetBookItem = this.assetBookItemRepo.create({
        bookId: toAssetBook.id,
        assetId: item.assetId,
        roomId: warehouseRoomId,
        assignedAt: new Date(),
        quantity: 1,
        status: AssetBookItemStatus.IN_USE,
        note: `Tiếp nhận từ ${transaction.fromUnit?.name || 'đơn vị khác'} theo giao dịch ${transaction.id}`,
      });
      await this.assetBookItemRepo.save(newAssetBookItem);

      await this.assetRepo
        .createQueryBuilder()
        .update('assets')
        .set({ currentRoomId: warehouseRoomId })
        .where('id = :assetId', { assetId: item.assetId })
        .execute();
    }
  }
}
