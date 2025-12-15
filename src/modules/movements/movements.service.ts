import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CreateMovementDto } from './dto/create-movement.dto';
import { 
  UpdateMovementDto, 
  UpdateMovementStatusDto,
  ProposeMovementDto,
  ApproveMovementDto,
  RejectMovementDto,
  ExecuteMovementDto
} from './dto/update-movement.dto';
import { MovementFilterDto, SimplifiedMovementFilterDto } from './dto/filter-movement.dto';
import { AssetMovement } from 'src/entities/asset-movement.entity';
import { AssetMovementItem } from 'src/entities/asset-movement-item.entity';
import { AssetMovementHistory } from 'src/entities/asset-movement-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { Room } from 'src/entities/room.entity';
import { User } from 'src/entities/user.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { MoveStatus } from 'src/common/shared/MoveStatus';
import { AssetBookItemStatus } from 'src/common/shared/AssetBookItemStatus';
import { AssetBookStatus } from 'src/common/shared/AssetBookStatus';
import { AssetType } from 'src/common/shared/AssetType';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { MovementResponseDto, SimplifiedMovementResponseDto } from './dto/movement-response.dto';
import { PermissionConstants } from 'src/common/utils/permission.constant';
import { Permission } from 'src/entities/permission.entity';
import { Role } from 'src/entities/role.entity';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(AssetMovement)
    private movementRepository: Repository<AssetMovement>,
    @InjectRepository(AssetMovementItem)
    private movementItemRepository: Repository<AssetMovementItem>,
    @InjectRepository(AssetMovementHistory)
    private movementHistoryRepository: Repository<AssetMovementHistory>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AssetBook)
    private assetBookRepository: Repository<AssetBook>,
    @InjectRepository(AssetBookItem)
    private assetBookItemRepository: Repository<AssetBookItem>,
    private dataSource: DataSource,
  ) {}

  async createMovement(createDto: CreateMovementDto, requesterId: string, currentUser: User): Promise<MovementResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate requester exists
      const requester = await this.userRepository.findOne({ where: { id: requesterId } });
      if (!requester) {
        throw new NotFoundException('Người yêu cầu không tồn tại');
      }

      // Validate assets and rooms exist
      for (const item of createDto.items) {
        const asset = await this.assetRepository.findOne({ 
          where: { id: item.assetId },
          relations: ['currentRoom', 'currentRoom.unit']
        });
        if (!asset) {
          throw new NotFoundException(`Tài sản với ID ${item.assetId} không tồn tại`);
        }

        const fromRoom = await this.roomRepository.findOne({ where: { id: item.fromRoomId } });
        const toRoom = await this.roomRepository.findOne({ where: { id: item.toRoomId } });
        
        if (!fromRoom) {
          throw new NotFoundException(`Phòng nguồn với ID ${item.fromRoomId} không tồn tại`);
        }
        if (!toRoom) {
          throw new NotFoundException(`Phòng đích với ID ${item.toRoomId} không tồn tại`);
        }

        if (item.fromRoomId === item.toRoomId) {
          throw new BadRequestException(`Phòng nguồn và phòng đích không thể giống nhau cho tài sản ${asset.fixedCode}`);
        }

        if (!fromRoom || !fromRoom.unitId) {
          throw new BadRequestException(`Phòng nguồn ${item.fromRoomId} không có thông tin đơn vị`);
        }

        const currentYear = new Date().getFullYear();
        const assetBook = await this.findOrCreateAssetBook(
          queryRunner.manager,
          fromRoom.unitId,
          currentYear
        );

        const sourceItems = await queryRunner.manager
          .createQueryBuilder(AssetBookItem, 'abi')
          .where('abi.bookId = :bookId', { bookId: assetBook.id })
          .andWhere('abi.assetId = :assetId', { assetId: item.assetId })
          .andWhere('abi.roomId = :fromRoomId', { fromRoomId: item.fromRoomId })
          .andWhere('abi.status = :status', { status: AssetBookItemStatus.IN_USE })
          .getMany();

        const totalAvailableQuantity = sourceItems.reduce((sum, item) => sum + item.quantity, 0);
        const requestedQuantity = item.quantity || 1;

        if (totalAvailableQuantity < requestedQuantity) {
          throw new BadRequestException(
            `Tài sản ${asset.fixedCode} không đủ số lượng ở phòng nguồn. Có sẵn: ${totalAvailableQuantity}, yêu cầu: ${requestedQuantity}`
          );
        }
      }

      // Determine final status based on requested status and permissions
      let finalStatus = createDto.status || MoveStatus.DRAFT;
      let statusNote = 'Tạo yêu cầu di chuyển';
      let approverId: string | undefined;
      let approvedAt: Date | undefined;
      let approvalNote: string | undefined;

      // If user wants to propose (PENDING_APPROVAL) but has approval permission, auto-approve
      if (finalStatus === MoveStatus.PENDING_APPROVAL) {
        const userPermissions = currentUser.roles.flatMap((role: Role) => role.permissions?.map((perm: Permission) => perm.code)) || [];
        const hasApprovalPermission = userPermissions.includes(PermissionConstants.PERM_APPROVE_MOVEMENT);

        if (hasApprovalPermission) {
          finalStatus = MoveStatus.APPROVED;
          statusNote = 'Tạo và tự động phê duyệt yêu cầu di chuyển';
          approverId = requesterId;
          approvedAt = new Date();
          approvalNote = createDto.approvalNote || 'Tự động phê duyệt do có quyền';
        } else {
          statusNote = 'Tạo và gửi đề xuất yêu cầu di chuyển';
        }
      }

      // Create movement
      const movement = this.movementRepository.create({
        requesterId,
        status: finalStatus,
        requestNote: createDto.requestNote,
        approverId,
        approvedAt,
        createdAt: createDto.createdAt ? new Date(createDto.createdAt) : undefined,
        approvalNote,
      });

      const savedMovement = await queryRunner.manager.save(movement);

      // Create movement items
      const movementItems = createDto.items.map(item => 
        this.movementItemRepository.create({
          movementId: savedMovement.id,
          assetId: item.assetId,
          quantity: item.quantity || 1,
          fromRoomId: item.fromRoomId,
          toRoomId: item.toRoomId,
          note: item.note,
        })
      );

      const savedMovementItems = await queryRunner.manager.save(movementItems);

      // Create history record
      const history = this.movementHistoryRepository.create({
        movementId: savedMovement.id,
        oldStatus: null,
        newStatus: finalStatus,
        changedBy: requesterId,
        note: statusNote,
      });

      await queryRunner.manager.save(history);

      // Nếu tự động phê duyệt (status = APPROVED), cập nhật AssetBookItem ngay
      if (finalStatus === MoveStatus.APPROVED) {
        // Load items với relations để có thông tin room
        const itemsWithRelations = await queryRunner.manager.find(AssetMovementItem, {
          where: { movementId: savedMovement.id },
          relations: ['fromRoom', 'toRoom']
        });

        await this.updateAssetBookItemsOnApproval(
          queryRunner.manager,
          savedMovement.id,
          itemsWithRelations,
          requesterId
        );
      }

      await queryRunner.commitTransaction();

      return this.getMovementById(savedMovement.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllSimplified(filterDto: SimplifiedMovementFilterDto, currentUser: User): Promise<PaginatedResponseDto<SimplifiedMovementResponseDto>> {
    const queryBuilder = this.movementRepository.createQueryBuilder('movement')
      .leftJoinAndSelect('movement.requester', 'requester')
      .leftJoinAndSelect('movement.approver', 'approver')
      .leftJoinAndSelect('movement.items', 'items')
      .leftJoinAndSelect('items.asset', 'asset')
      .leftJoinAndSelect('items.fromRoom', 'fromRoom')
      .leftJoinAndSelect('items.toRoom', 'toRoom');

    // Apply user-specific filters for DRAFT status
    // Chỉ hiển thị bản nháp của chính người tạo, các trạng thái khác thì hiển thị tất cả
    if (filterDto.status === MoveStatus.DRAFT) {
      queryBuilder.andWhere('movement.status = :status AND movement.requesterId = :currentUserId', { 
        status: filterDto.status,
        currentUserId: currentUser.id 
      });
    } else if (filterDto.status) {
      queryBuilder.andWhere('movement.status = :status', { status: filterDto.status });
    } else {
      // Nếu không filter theo status, vẫn cần filter DRAFT theo user
      queryBuilder.andWhere('(movement.status != :draftStatus OR movement.requesterId = :currentUserId)', {
        draftStatus: MoveStatus.DRAFT,
        currentUserId: currentUser.id
      });
    }

    if (filterDto.searchNote) {
      queryBuilder.andWhere('(movement.requestNote ILIKE :searchNote OR movement.approvalNote ILIKE :searchNote)', 
        { searchNote: `%${filterDto.searchNote}%` });
    }

    // Apply global search
    if (filterDto.search) {
      queryBuilder.andWhere(
        '(movement.requestNote ILIKE :search OR movement.approvalNote ILIKE :search OR requester.fullName ILIKE :search OR approver.fullName ILIKE :search)',
        { search: `%${filterDto.search}%` }
      );
    }

    // Apply dynamic conditions from BaseFilterDto
    if (filterDto.conditions && filterDto.conditions.length > 0) {
      filterDto.conditions.forEach((condition, index) => {
        if (condition.field && condition.operator && condition.value) {
          const paramName = `condition_${index}`;
          switch (condition.operator) {
            case 'equals':
              queryBuilder.andWhere(`movement.${condition.field} = :${paramName}`, { [paramName]: condition.value[0] });
              break;
            case 'contains':
              queryBuilder.andWhere(`movement.${condition.field} ILIKE :${paramName}`, { [paramName]: `%${condition.value[0]}%` });
              break;
            case 'in':
              queryBuilder.andWhere(`movement.${condition.field} IN (:...${paramName})`, { [paramName]: condition.value });
              break;
            case 'between':
              if (condition.dateFrom && condition.dateTo) {
                queryBuilder.andWhere(`movement.${condition.field} BETWEEN :${paramName}_from AND :${paramName}_to`, {
                  [`${paramName}_from`]: condition.dateFrom,
                  [`${paramName}_to`]: condition.dateTo
                });
              }
              break;
          }
        }
      });
    }

    // Apply sorting
    if (filterDto.sorting && filterDto.sorting.length > 0) {
      filterDto.sorting.forEach((sort, index) => {
        if (sort.field && sort.direction) {
          const direction = sort.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          if (index === 0) {
            queryBuilder.orderBy(`movement.${sort.field}`, direction);
          } else {
            queryBuilder.addOrderBy(`movement.${sort.field}`, direction);
          }
        }
      });
    } else {
      // Default sorting by creation date (newest first)
      queryBuilder.orderBy('movement.createdAt', 'DESC');
    }

    // Apply pagination
    const page = filterDto.pagination?.currentPage || 1;
    const limit = filterDto.pagination?.itemsPerPage || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [movements, total] = await queryBuilder.getManyAndCount();

    const data = movements.map(movement => ({
      id: movement.id,
      status: movement.status,
      requestNote: movement.requestNote,
      approvalNote: movement.approvalNote,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      requester: movement.requester ? {
        id: movement.requester.id,
        fullName: movement.requester.fullName,
        email: movement.requester.email,
      } : null,
      approver: movement.approver ? {
        id: movement.approver.id,
        fullName: movement.approver.fullName,
        email: movement.approver.email,
      } : null,
      itemCount: movement.items?.length || 0,
    }));

    return new PaginatedResponseDto(data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  }

  async getMovementById(id: string): Promise<MovementResponseDto> {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: [
        'requester',
        'approver',
        'items',
        'items.asset',
        'items.asset.currentRoom',
        'items.asset.currentRoom.unit',
        'items.asset.category',
        'items.fromRoom',
        'items.fromRoom.unit',
        'items.toRoom',
        'items.toRoom.unit',
        'items.mover',
        'histories',
        'histories.changer',
      ],
    });

    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    return {
      id: movement.id,
      status: movement.status,
      requestNote: movement.requestNote,
      approvalNote: movement.approvalNote,
      rejectionReason: movement.rejectionReason,
      approvedAt: movement.approvedAt,
      completedAt: movement.completedAt,
      cancelledAt: movement.cancelledAt,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      requester: movement.requester ? {
        id: movement.requester.id,
        fullName: movement.requester.fullName,
        email: movement.requester.email,
      } : null,
      approver: movement.approver ? {
        id: movement.approver.id,
        fullName: movement.approver.fullName,
        email: movement.approver.email,
      } : null,
      items: movement.items?.map(item => ({
        id: item.id,
        assetId: item.assetId,
        quantity: item.quantity || 1,
        fromRoomId: item.fromRoomId,
        toRoomId: item.toRoomId,
        note: item.note,
        movedAt: item.movedAt,
        movedBy: item.movedBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        asset: item.asset ? {
          id: item.asset.id,
          name: item.asset.name,
          ktCode: item.asset.ktCode,
          fixedCode: item.asset.fixedCode,
          specs: item.asset.specs,
          unit: item.asset.unit,
          quantity: item.asset.quantity,
          entrydate: item.asset.entrydate instanceof Date ? item.asset.entrydate.toISOString().split('T')[0] : item.asset.entrydate,
          origin: item.asset.origin,
          purchasePackage: item.asset.purchasePackage,
          type: item.asset.type,
          status: item.asset.status,
          currentRoom: item.asset.currentRoom ? {
            id: item.asset.currentRoom.id,
            name: item.asset.currentRoom.name,
            roomCode: item.asset.currentRoom.roomCode,
            unit: item.asset.currentRoom.unit ? {
              id: item.asset.currentRoom.unit.id,
              name: item.asset.currentRoom.unit.name,
              unitCode: item.asset.currentRoom.unit.unitCode,
            } : null,
          } : null,
          category: item.asset.category ? {
            id: item.asset.category.id,
            name: item.asset.category.name,
          } : null,
        } : null,
        fromRoom: item.fromRoom ? {
          id: item.fromRoom.id,
          name: item.fromRoom.name,
          code: item.fromRoom.roomCode,
          unit: item.fromRoom.unit ? {
            id: item.fromRoom.unit.id,
            name: item.fromRoom.unit.name,
            unitCode: item.fromRoom.unit.unitCode,
          } : null,
        } : null,
        toRoom: item.toRoom ? {
          id: item.toRoom.id,
          name: item.toRoom.name,
          code: item.toRoom.roomCode,
          unit: item.toRoom.unit ? {
            id: item.toRoom.unit.id,
            name: item.toRoom.unit.name,
            unitCode: item.toRoom.unit.unitCode,
          } : null,
        } : null,
        mover: item.mover ? {
          id: item.mover.id,
          fullName: item.mover.fullName,
          email: item.mover.email,
        } : null,

      })) || [],
      histories: movement.histories?.map(history => ({
        id: history.id,
        oldStatus: history.oldStatus,
        newStatus: history.newStatus,
        note: history.note,
        createdAt: history.createdAt,
        changer: history.changer ? {
          id: history.changer.id,
          fullName: history.changer.fullName,
          email: history.changer.email,
        } : null,
        evidenceUrl: history.evidenceUrl,
      })) || [],
    };
  }

  async updateMovement(id: string, updateDto: UpdateMovementDto, currentUser: User): Promise<MovementResponseDto> {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    if (movement.status !== MoveStatus.DRAFT && movement.status !== MoveStatus.REJECTED) {
      throw new BadRequestException('Chỉ có thể cập nhật yêu cầu di chuyển ở trạng thái nháp (DRAFT) hoặc bị từ chối (REJECTED)');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update movement basic info
      if (updateDto.requestNote !== undefined) {
        movement.requestNote = updateDto.requestNote;
      }

      // Handle status change with permission check
      if (updateDto.status !== undefined && updateDto.status !== movement.status) {
        const oldStatus = movement.status;
        let newStatus = updateDto.status;
        let historyNote = `Cập nhật trạng thái từ ${oldStatus} sang ${newStatus}`;

        // If trying to change to PENDING_APPROVAL, check if user has approval permission
        if (updateDto.status === MoveStatus.PENDING_APPROVAL) {
          const userPermissions = currentUser.roles.flatMap((role: Role) => role.permissions?.map((perm: Permission) => perm.code)) || [];
          const hasApprovalPermission = userPermissions.includes(PermissionConstants.PERM_APPROVE_MOVEMENT);

          if (hasApprovalPermission) {
            // Auto-approve instead of pending
            newStatus = MoveStatus.APPROVED;
            movement.status = MoveStatus.APPROVED;
            movement.approverId = currentUser.id;
            movement.approvedAt = new Date();
            movement.approvalNote = updateDto.approvalNote || 'Tự động phê duyệt do có quyền';
            historyNote = 'Cập nhật và tự động phê duyệt do có quyền';
          } else {
            movement.status = MoveStatus.PENDING_APPROVAL;
            historyNote = 'Cập nhật và gửi đề xuất phê duyệt';
          }
        } else {
          movement.status = updateDto.status;
        }

        // Create history record for status change
        const history = this.movementHistoryRepository.create({
          movementId: id,
          oldStatus,
          newStatus,
          changedBy: currentUser.id,
          note: historyNote,
        });
        await queryRunner.manager.save(history);
      }

      await queryRunner.manager.save(movement);

      // Update items if provided
      if (updateDto.items) {
        // Remove existing items
        await queryRunner.manager.delete(AssetMovementItem, { movementId: id });

        // Validate and create new items
        for (const item of updateDto.items) {
          const asset = await this.assetRepository.findOne({ 
            where: { id: item.assetId },
            relations: ['currentRoom', 'currentRoom.unit']
          });
          if (!asset) {
            throw new NotFoundException(`Tài sản với ID ${item.assetId} không tồn tại`);
          }

          const fromRoom = await this.roomRepository.findOne({ where: { id: item.fromRoomId } });
          const toRoom = await this.roomRepository.findOne({ where: { id: item.toRoomId } });
          
          if (!fromRoom || !toRoom) {
            throw new NotFoundException('Phòng nguồn hoặc phòng đích không tồn tại');
          }

          if (!fromRoom.unitId) {
            throw new BadRequestException(`Phòng nguồn ${item.fromRoomId} không có thông tin đơn vị`);
          }

          if (item.fromRoomId === item.toRoomId) {
            throw new BadRequestException(`Phòng nguồn và phòng đích không thể giống nhau cho tài sản ${asset.fixedCode}`);
          }

          const currentYear = new Date().getFullYear();
          const assetBook = await this.findOrCreateAssetBook(
            queryRunner.manager,
            fromRoom.unitId,
            currentYear
          );

          const sourceItems = await queryRunner.manager
            .createQueryBuilder(AssetBookItem, 'abi')
            .where('abi.bookId = :bookId', { bookId: assetBook.id })
            .andWhere('abi.assetId = :assetId', { assetId: item.assetId })
            .andWhere('abi.roomId = :fromRoomId', { fromRoomId: item.fromRoomId })
            .andWhere('abi.status = :status', { status: AssetBookItemStatus.IN_USE })
            .getMany();

          const totalAvailableQuantity = sourceItems.reduce((sum, item) => sum + item.quantity, 0);
          const requestedQuantity = item.quantity || 1;

          if (totalAvailableQuantity < requestedQuantity) {
            throw new BadRequestException(
              `Tài sản ${asset.fixedCode} không đủ số lượng ở phòng nguồn. Có sẵn: ${totalAvailableQuantity}, yêu cầu: ${requestedQuantity}`
            );
          }
        }

        // Create new items
        const newItems = updateDto.items.map(item => 
          this.movementItemRepository.create({
            movementId: id,
            assetId: item.assetId,
            quantity: item.quantity || 1,
            fromRoomId: item.fromRoomId,
            toRoomId: item.toRoomId,
            note: item.note,
          })
        );

        await queryRunner.manager.save(newItems);
      }

      await queryRunner.commitTransaction();

      return this.getMovementById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async proposeMovement(id: string, proposeDto: ProposeMovementDto, userId: string): Promise<MovementResponseDto> {
    return this.updateMovementStatus(
      id, 
      MoveStatus.PENDING_APPROVAL, 
      userId, 
      proposeDto.note || 'Gửi đề xuất di chuyển',
      {
        evidenceUrl: proposeDto.evidenceUrl,
      }
    );
  }

  async approveMovement(id: string, approveDto: ApproveMovementDto, approverId: string): Promise<MovementResponseDto> {
    const movement = await this.movementRepository.findOne({ 
      where: { id },
      relations: ['items', 'items.fromRoom', 'items.toRoom', 'items.asset']
    });
    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    if (movement.status !== MoveStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể phê duyệt yêu cầu di chuyển ở trạng thái chờ phê duyệt');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      movement.status = MoveStatus.APPROVED;
      movement.approverId = approverId;
      movement.approvalNote = approveDto.approvalNote;
      movement.approvedAt = new Date();

      await queryRunner.manager.save(movement);

      const approvalHistory = this.movementHistoryRepository.create({
        movementId: id,
        oldStatus: MoveStatus.PENDING_APPROVAL,
        newStatus: MoveStatus.APPROVED,
        changedBy: approverId,
        note: approveDto.approvalNote || 'Phê duyệt yêu cầu di chuyển',
        evidenceUrl: approveDto.evidenceUrl,
      });

      await queryRunner.manager.save(approvalHistory);

      if (movement.items && movement.items.length > 0) {
        await this.updateAssetBookItemsOnApproval(
          queryRunner.manager,
          id,
          movement.items,
          approverId
        );
      }

      await queryRunner.commitTransaction();

      return this.getMovementById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectMovement(id: string, rejectDto: RejectMovementDto, userId: string): Promise<MovementResponseDto> {
    const movement = await this.movementRepository.findOne({ where: { id } });
    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    if (movement.status !== MoveStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể từ chối yêu cầu di chuyển ở trạng thái chờ phê duyệt');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldStatus = movement.status;
      movement.status = MoveStatus.REJECTED;
      movement.rejectionReason = rejectDto.rejectionReason;

      await queryRunner.manager.save(movement);

      // Create history record
      const history = this.movementHistoryRepository.create({
        movementId: id,
        oldStatus,
        newStatus: MoveStatus.REJECTED,
        changedBy: userId,
        note: rejectDto.rejectionReason,
      });

      await queryRunner.manager.save(history);

      await queryRunner.commitTransaction();

      return this.getMovementById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateMovementStatus(
    id: string,
    status: MoveStatus,
    userId: string,
    note?: string,
    additionalData?: {
      approvalNote?: string;
      rejectionReason?: string;
      evidenceUrl?: string;
    }
  ): Promise<MovementResponseDto> {
    const movement = await this.movementRepository.findOne({ where: { id } });
    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    const oldStatus = movement.status;

    // Validate status transitions
    const validTransitions = this.getValidStatusTransitions(oldStatus);
    if (!validTransitions.includes(status)) {
      throw new BadRequestException(`Không thể chuyển từ trạng thái ${oldStatus} sang ${status}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      movement.status = status;

      if (additionalData?.approvalNote) {
        movement.approvalNote = additionalData.approvalNote;
      }
      if (additionalData?.rejectionReason) {
        movement.rejectionReason = additionalData.rejectionReason;
      }

      // Set timestamps based on status
      switch (status) {
        case MoveStatus.APPROVED:
          movement.approvedAt = new Date();
          movement.approverId = userId;
          break;
        case MoveStatus.CANCELLED:
          movement.cancelledAt = new Date();
          break;
      }

      await queryRunner.manager.save(movement);

      // Create history record
      const history = this.movementHistoryRepository.create({
        movementId: id,
        oldStatus,
        newStatus: status,
        changedBy: userId,
        note: note || `Cập nhật trạng thái từ ${oldStatus} sang ${status}`,
        evidenceUrl: additionalData?.evidenceUrl,
      });

      await queryRunner.manager.save(history);

      await queryRunner.commitTransaction();

      return this.getMovementById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getValidStatusTransitions(currentStatus: MoveStatus): MoveStatus[] {
    const transitions: Record<MoveStatus, MoveStatus[]> = {
      [MoveStatus.DRAFT]: [MoveStatus.PENDING_APPROVAL, MoveStatus.CANCELLED],
      [MoveStatus.PENDING_APPROVAL]: [MoveStatus.APPROVED, MoveStatus.REJECTED, MoveStatus.CANCELLED],
      [MoveStatus.APPROVED]: [MoveStatus.CANCELLED],
      [MoveStatus.REJECTED]: [MoveStatus.PENDING_APPROVAL, MoveStatus.CANCELLED],
      [MoveStatus.COMPLETED]: [],
      [MoveStatus.CANCELLED]: [],
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Tìm hoặc tạo AssetBook cho unit và năm
   */
  private async findOrCreateAssetBook(
    manager: EntityManager,
    unitId: string,
    year: number
  ): Promise<AssetBook> {
    let assetBook = await manager.findOne(AssetBook, {
      where: { unitId, year }
    });

    if (!assetBook) {
      assetBook = manager.create(AssetBook, {
        unitId,
        year,
        status: AssetBookStatus.OPEN,
      });
      assetBook = await manager.save(assetBook);
    }

    return assetBook;
  }

  private async updateAssetBookItemsOnApproval(
    manager: EntityManager,
    movementId: string,
    items: AssetMovementItem[],
    approverId: string
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    for (const item of items) {
      const asset = await manager.findOne(Asset, {
        where: { id: item.assetId },
        relations: ['currentRoom', 'currentRoom.unit']
      });

      if (!asset) {
        throw new NotFoundException(`Không tìm thấy tài sản ${item.assetId}`);
      }

      const fromRoom = await manager.findOne(Room, {
        where: { id: item.fromRoomId },
        relations: ['unit']
      });

      if (!fromRoom || !fromRoom.unitId) {
        throw new NotFoundException(`Không tìm thấy thông tin phòng nguồn ${item.fromRoomId}`);
      }

      await manager.update(Asset, 
        { id: item.assetId }, 
        { currentRoomId: item.toRoomId }
      );

      await manager.update(AssetMovementItem,
        { id: item.id },
        { 
          movedAt: new Date(),
          movedBy: approverId,
        }
      );

      const assetBook = await this.findOrCreateAssetBook(
        manager,
        fromRoom.unitId,
        currentYear
      );

      const moveQuantity = item.quantity || 1;
      
      const sourceItems = await manager
        .createQueryBuilder(AssetBookItem, 'abi')
        .where('abi.bookId = :bookId', { bookId: assetBook.id })
        .andWhere('abi.assetId = :assetId', { assetId: item.assetId })
        .andWhere('abi.roomId = :fromRoomId', { fromRoomId: item.fromRoomId })
        .andWhere('abi.status = :status', { status: AssetBookItemStatus.IN_USE })
        .orderBy('abi.assignedAt', 'ASC')
        .getMany();

      let remainingQuantity = moveQuantity;
      
      if (asset.type === AssetType.FIXED_ASSET) {
        for (const sourceItem of sourceItems) {
          if (remainingQuantity <= 0) break;
          
          const quantityToMove = Math.min(sourceItem.quantity, remainingQuantity);
          
          sourceItem.roomId = item.toRoomId;
          sourceItem.note = `${sourceItem.note || ''}\nDi chuyển ${quantityToMove} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${movementId}`.trim();
          await manager.save(sourceItem);
          
          remainingQuantity -= quantityToMove;
        }
      } else {
        for (const sourceItem of sourceItems) {
          if (remainingQuantity <= 0) break;
          
          const quantityToMove = Math.min(sourceItem.quantity, remainingQuantity);
          
          const existingTargetItem = await manager.findOne(AssetBookItem, {
            where: {
              bookId: assetBook.id,
              assetId: item.assetId,
              roomId: item.toRoomId,
              status: AssetBookItemStatus.IN_USE,
            },
          });

          if (existingTargetItem && sourceItem.id !== existingTargetItem.id) {
            existingTargetItem.quantity += quantityToMove;
            existingTargetItem.note = `${existingTargetItem.note || ''}\nNhận thêm ${quantityToMove} từ ${item.fromRoom?.name || 'phòng nguồn'} theo yêu cầu di chuyển ${movementId}`.trim();
            await manager.save(existingTargetItem);
            
            if (sourceItem.quantity <= quantityToMove) {
              sourceItem.status = AssetBookItemStatus.TRANSFERRED;
              sourceItem.note = `${sourceItem.note || ''}\nDi chuyển ${sourceItem.quantity} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${movementId}`.trim();
            } else {
              sourceItem.quantity -= quantityToMove;
              sourceItem.note = `${sourceItem.note || ''}\nDi chuyển ${quantityToMove} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${movementId}`.trim();
            }
            await manager.save(sourceItem);
          } else {
            if (sourceItem.quantity <= quantityToMove) {
              sourceItem.roomId = item.toRoomId;
              sourceItem.note = `${sourceItem.note || ''}\nDi chuyển ${sourceItem.quantity} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${movementId}`.trim();
              await manager.save(sourceItem);
            } else {
              const remainingQty = sourceItem.quantity - quantityToMove;
              sourceItem.quantity = remainingQty;
              sourceItem.note = `${sourceItem.note || ''}\nGiữ lại ${remainingQty} ở phòng nguồn sau khi di chuyển ${quantityToMove}`.trim();
              await manager.save(sourceItem);
              
              const newItem = manager.create(AssetBookItem, {
                bookId: assetBook.id,
                assetId: item.assetId,
                roomId: item.toRoomId,
                assignedAt: sourceItem.assignedAt,
                quantity: quantityToMove,
                status: AssetBookItemStatus.IN_USE,
                note: item.note || `Di chuyển ${quantityToMove} từ ${item.fromRoom?.name || 'phòng nguồn'} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${movementId}`,
              });
              await manager.save(newItem);
            }
          }
          
          remainingQuantity -= quantityToMove;
        }
      }

      if (remainingQuantity > 0) {
        throw new BadRequestException(
          `Không đủ số lượng để di chuyển cho tài sản ${item.assetId}. Thiếu: ${remainingQuantity}`
        );
      }
    }
  }

  async removeMovement(id: string): Promise<void> {
    const movement = await this.movementRepository.findOne({ where: { id } });
    if (!movement) {
      throw new NotFoundException('Không tìm thấy yêu cầu di chuyển');
    }

    if (![MoveStatus.DRAFT, MoveStatus.REJECTED, MoveStatus.CANCELLED].includes(movement.status)) {
      throw new BadRequestException('Chỉ có thể xóa yêu cầu di chuyển ở trạng thái nháp, bị từ chối hoặc đã hủy');
    }

    await this.movementRepository.softDelete(id);
  }
}
