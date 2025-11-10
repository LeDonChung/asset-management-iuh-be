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
          relations: ['currentRoom']
        });
        if (!asset) {
          throw new NotFoundException(`Tài sản với ID ${item.assetId} không tồn tại`);
        }

        // Check if asset is currently in the from room
        if (asset.currentRoomId !== item.fromRoomId) {
          throw new BadRequestException(`Tài sản ${asset.fixedCode} hiện không ở phòng nguồn được chỉ định`);
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
        approvalNote,
      });

      const savedMovement = await queryRunner.manager.save(movement);

      // Create movement items
      const movementItems = createDto.items.map(item => 
        this.movementItemRepository.create({
          movementId: savedMovement.id,
          assetId: item.assetId,
          fromRoomId: item.fromRoomId,
          toRoomId: item.toRoomId,
          note: item.note,
        })
      );

      await queryRunner.manager.save(movementItems);

      // Create history record
      const history = this.movementHistoryRepository.create({
        movementId: savedMovement.id,
        oldStatus: null,
        newStatus: finalStatus,
        changedBy: requesterId,
        note: statusNote,
      });

      await queryRunner.manager.save(history);

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
        'items.fromRoom',
        'items.toRoom',
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
        } : null,
        fromRoom: item.fromRoom ? {
          id: item.fromRoom.id,
          name: item.fromRoom.name,
          code: item.fromRoom.roomCode,
        } : null,
        toRoom: item.toRoom ? {
          id: item.toRoom.id,
          name: item.toRoom.name,
          code: item.toRoom.roomCode,
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

    if (movement.status !== MoveStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể cập nhật yêu cầu di chuyển ở trạng thái nháp');
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
          const asset = await this.assetRepository.findOne({ where: { id: item.assetId } });
          if (!asset) {
            throw new NotFoundException(`Tài sản với ID ${item.assetId} không tồn tại`);
          }

          if (asset.currentRoomId !== item.fromRoomId) {
            throw new BadRequestException(`Tài sản ${asset.fixedCode} hiện không ở phòng nguồn được chỉ định`);
          }

          const fromRoom = await this.roomRepository.findOne({ where: { id: item.fromRoomId } });
          const toRoom = await this.roomRepository.findOne({ where: { id: item.toRoomId } });
          
          if (!fromRoom || !toRoom) {
            throw new NotFoundException('Phòng nguồn hoặc phòng đích không tồn tại');
          }

          if (item.fromRoomId === item.toRoomId) {
            throw new BadRequestException(`Phòng nguồn và phòng đích không thể giống nhau cho tài sản ${asset.fixedCode}`);
          }
        }

        // Create new items
        const newItems = updateDto.items.map(item => 
          this.movementItemRepository.create({
            movementId: id,
            assetId: item.assetId,
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
    return this.updateMovementStatus(id, MoveStatus.PENDING_APPROVAL, userId, proposeDto.note || 'Gửi đề xuất di chuyển');
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
      // Update movement to APPROVED
      movement.status = MoveStatus.APPROVED;
      movement.approverId = approverId;
      movement.approvalNote = approveDto.approvalNote;
      movement.approvedAt = new Date();

      await queryRunner.manager.save(movement);

      // Create history record for approval
      const approvalHistory = this.movementHistoryRepository.create({
        movementId: id,
        oldStatus: MoveStatus.PENDING_APPROVAL,
        newStatus: MoveStatus.APPROVED,
        changedBy: approverId,
        note: approveDto.approvalNote || 'Phê duyệt yêu cầu di chuyển',
      });

      await queryRunner.manager.save(approvalHistory);

      // Update asset locations, asset book and complete movement
      if (movement.items && movement.items.length > 0) {
        const currentYear = new Date().getFullYear();

        for (const item of movement.items) {
          // Load asset with current room to get unitId
          const asset = await queryRunner.manager.findOne(Asset, {
            where: { id: item.assetId },
            relations: ['currentRoom', 'currentRoom.unit']
          });

          if (!asset || !asset.currentRoom || !asset.currentRoom.unit) {
            throw new NotFoundException(`Không tìm thấy thông tin đầy đủ của tài sản ${item.assetId}`);
          }

          // Update asset currentRoomId
          await queryRunner.manager.update(Asset, 
            { id: item.assetId }, 
            { currentRoomId: item.toRoomId }
          );
  
          // Update movement item
          await queryRunner.manager.update(AssetMovementItem,
            { id: item.id },
            { 
              movedAt: new Date(),
              movedBy: approverId,
            }
          );

          // Update AssetBookItem - cập nhật roomId trong sổ tài sản
          const assetBook = await this.findOrCreateAssetBook(
            queryRunner.manager,
            asset.currentRoom.unit.id,
            currentYear
          );

          await queryRunner.manager
            .createQueryBuilder()
            .update(AssetBookItem)
            .set({ 
              roomId: item.toRoomId,
              note: item.note || `Di chuyển từ ${item.fromRoom?.name || 'phòng nguồn'} đến ${item.toRoom?.name || 'phòng đích'} theo yêu cầu di chuyển ${id}`,
            })
            .where('bookId = :bookId', { bookId: assetBook.id })
            .andWhere('assetId = :assetId', { assetId: item.assetId })
            .andWhere('status = :status', { status: AssetBookItemStatus.IN_USE })
            .execute();
        }
  
        // Update movement status to COMPLETED
        movement.status = MoveStatus.COMPLETED;
        movement.completedAt = new Date();
  
        await queryRunner.manager.save(movement);
  
        // Create history record for completion
        const completionHistory = this.movementHistoryRepository.create({
          movementId: id,
          oldStatus: MoveStatus.APPROVED,
          newStatus: MoveStatus.COMPLETED,
          changedBy: approverId,
          note: 'Hoàn thành di chuyển tài sản',
        });
  
        await queryRunner.manager.save(completionHistory);
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

    if (![MoveStatus.PENDING_APPROVAL, MoveStatus.APPROVED].includes(movement.status)) {
      throw new BadRequestException('Chỉ có thể từ chối yêu cầu di chuyển ở trạng thái chờ phê duyệt hoặc đã phê duyệt');
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
        case MoveStatus.COMPLETED:
          movement.completedAt = new Date();
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
      [MoveStatus.APPROVED]: [MoveStatus.COMPLETED, MoveStatus.REJECTED, MoveStatus.CANCELLED],
      [MoveStatus.REJECTED]: [MoveStatus.CANCELLED],
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
