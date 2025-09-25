import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventorySubDto } from './dto/create-inventory-sub.dto';
import { UpdateInventorySubDto } from './dto/update-inventory-sub.dto';
import { InventorySubResponseDto } from './dto/inventory-sub-response.dto';
import { InventorySub } from 'src/entities/inventory-sub.entity';
import { InventorySessionUnit } from 'src/entities/inventory-session-unit.entity';
import { SubInventoryMember } from 'src/entities/sub-inventory-member.entity';
import { User } from 'src/entities/user.entity';
import { CommitteeRole } from 'src/common/shared/CommitteeRole';
import { InventorySubStatus } from 'src/common/shared/InventorySubStatus';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InventorySubService {
  constructor(
    @InjectRepository(InventorySub)
    private inventorySubRepository: Repository<InventorySub>,
    @InjectRepository(InventorySessionUnit)
    private inventorySessionUnitRepository: Repository<InventorySessionUnit>,
    @InjectRepository(SubInventoryMember)
    private subInventoryMemberRepository: Repository<SubInventoryMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createInventorySubDto: CreateInventorySubDto, currentUser: User): Promise<InventorySubResponseDto> {
    const { leaderId, secretaryId, memberIds, inventorySessionUnitId, ...subData } = createInventorySubDto;

    // Kiểm tra cơ sở tham gia có tồn tại không
    const sessionUnit = await this.inventorySessionUnitRepository.findOne({
      where: { id: inventorySessionUnitId }
    });

    if (!sessionUnit) {
      throw new NotFoundException(`Cơ sở tham gia với ID ${inventorySessionUnitId} không tồn tại`);
    }

    // Kiểm tra cơ sở đã có tiểu ban chưa
    const existingSub = await this.inventorySubRepository.findOne({
      where: { inventorySessionUnitId }
    });

    if (existingSub) {
      throw new ConflictException('Cơ sở này đã có tiểu ban');
    }

    // Validate tất cả user IDs
    const allUserIds = [leaderId, secretaryId, ...memberIds];
    const uniqueUserIds = [...new Set(allUserIds)];
    
    if (allUserIds.length !== uniqueUserIds.length) {
      throw new BadRequestException('Không thể có user trùng lặp trong tiểu ban');
    }

    const users = await this.userRepository.findByIds(uniqueUserIds);
    if (users.length !== uniqueUserIds.length) {
      throw new NotFoundException('Một hoặc nhiều user không tồn tại');
    }

    // Tạo tiểu ban
    const newSub = this.inventorySubRepository.create({
      ...subData,
      inventorySessionUnitId,
      createdBy: currentUser.id
    });

    const savedSub = await this.inventorySubRepository.save(newSub);

    // Tạo thành viên tiểu ban
    const members = [
      // Trưởng tiểu ban
      this.subInventoryMemberRepository.create({
        userId: leaderId,
        subInventoryId: savedSub.id,
        role: CommitteeRole.LEADER,
        createdBy: currentUser.id
      }),
      // Thư ký tiểu ban
      this.subInventoryMemberRepository.create({
        userId: secretaryId,
        subInventoryId: savedSub.id,
        role: CommitteeRole.SECRETARY,
        createdBy: currentUser.id
      }),
      // Các thành viên
      ...memberIds.map(userId => this.subInventoryMemberRepository.create({
        userId,
        subInventoryId: savedSub.id,
        role: CommitteeRole.MEMBER,
        createdBy: currentUser.id
      }))
    ];

    await this.subInventoryMemberRepository.save(members);

    // Lấy thông tin đầy đủ để trả về
    return this.findOne(savedSub.id);
  }

  async findAll(sessionId?: string, status?: string): Promise<InventorySubResponseDto[]> {
    const queryBuilder = this.inventorySubRepository.createQueryBuilder('sub')
      .leftJoinAndSelect('sub.inventorySessionUnit', 'sessionUnit')
      .leftJoinAndSelect('sub.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('sub.groups', 'groups')
      .leftJoinAndSelect('groups.members', 'groupMembers')
      .leftJoinAndSelect('groupMembers.user', 'groupUser')
      .leftJoinAndSelect('groups.assignments', 'assignments')
      .leftJoinAndSelect('assignments.unit', 'unit')
      .orderBy('sub.createdAt', 'DESC');

    if (sessionId) {
      queryBuilder.andWhere('sessionUnit.sessionId = :sessionId', { sessionId });
    }

    if (status) {
      queryBuilder.andWhere('sub.status = :status', { status });
    }

    const subs = await queryBuilder.getMany();

    return plainToInstance(InventorySubResponseDto, subs, {
      excludeExtraneousValues: true
    });
  }

  async findOne(id: string): Promise<InventorySubResponseDto> {
    const sub = await this.inventorySubRepository.findOne({
      where: { id },
      relations: [
        'inventorySessionUnit', 
        'members', 
        'members.user',
        'groups',
        'groups.members',
        'groups.members.user',
        'groups.assignments',
        'groups.assignments.unit'
      ]
    });

    if (!sub) {
      throw new NotFoundException(`Tiểu ban với ID ${id} không tồn tại`);
    }

    return plainToInstance(InventorySubResponseDto, sub, {
      excludeExtraneousValues: true
    });
  }

  async update(id: string, updateInventorySubDto: UpdateInventorySubDto, currentUser: User): Promise<InventorySubResponseDto> {
    const { leaderId, secretaryId, memberIds, ...updateData } = updateInventorySubDto;

    const sub = await this.inventorySubRepository.findOne({
      where: { id },
      relations: ['members']
    });

    if (!sub) {
      throw new NotFoundException(`Tiểu ban với ID ${id} không tồn tại`);
    }

    // Cập nhật thông tin cơ bản
    Object.assign(sub, updateData);
    await this.inventorySubRepository.save(sub);

    // Nếu có cập nhật thành viên
    if (leaderId || secretaryId || memberIds) {
      // Xóa tất cả thành viên cũ
      await this.subInventoryMemberRepository.delete({ subInventoryId: id });

      // Validate và tạo danh sách thành viên mới
      const allUserIds = [];
      if (leaderId) allUserIds.push(leaderId);
      if (secretaryId) allUserIds.push(secretaryId);
      if (memberIds) allUserIds.push(...memberIds);

      const uniqueUserIds = [...new Set(allUserIds)];
      
      if (allUserIds.length !== uniqueUserIds.length) {
        throw new BadRequestException('Không thể có user trùng lặp trong tiểu ban');
      }

      const users = await this.userRepository.findByIds(uniqueUserIds);
      if (users.length !== uniqueUserIds.length) {
        throw new NotFoundException('Một hoặc nhiều user không tồn tại');
      }

      // Tạo thành viên mới
      const newMembers = [];
      
      if (leaderId) {
        newMembers.push(this.subInventoryMemberRepository.create({
          userId: leaderId,
          subInventoryId: id,
          role: CommitteeRole.LEADER,
          createdBy: currentUser.id
        }));
      }

      if (secretaryId) {
        newMembers.push(this.subInventoryMemberRepository.create({
          userId: secretaryId,
          subInventoryId: id,
          role: CommitteeRole.SECRETARY,
          createdBy: currentUser.id
        }));
      }

      if (memberIds) {
        newMembers.push(...memberIds.map(userId => this.subInventoryMemberRepository.create({
          userId,
          subInventoryId: id,
          role: CommitteeRole.MEMBER,
          createdBy: currentUser.id
        })));
      }

      await this.subInventoryMemberRepository.save(newMembers);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const sub = await this.inventorySubRepository.findOne({
      where: { id }
    });

    if (!sub) {
      throw new NotFoundException(`Tiểu ban với ID ${id} không tồn tại`);
    }

    // Kiểm tra trạng thái có thể xóa không
    if (sub.status === InventorySubStatus.ACTIVE) {
      throw new BadRequestException('Không thể xóa tiểu ban đang hoạt động');
    }

    // Xóa các thành viên trước
    await this.subInventoryMemberRepository.delete({ subInventoryId: id });

    // Xóa tiểu ban (soft delete)
    await this.inventorySubRepository.delete(id);
  }

  async findBySessionUnit(sessionUnitId: string): Promise<InventorySubResponseDto> {
    const sub = await this.inventorySubRepository.findOne({
      where: { inventorySessionUnitId: sessionUnitId },
      relations: [
        'inventorySessionUnit', 
        'members', 
        'members.user',
        'groups',
        'groups.members',
        'groups.members.user',
        'groups.assignments',
        'groups.assignments.unit'
      ]
    });

    if (!sub) {
      throw new NotFoundException(`Không tìm thấy tiểu ban cho cơ sở ${sessionUnitId}`);
    }

    return plainToInstance(InventorySubResponseDto, sub, {
      excludeExtraneousValues: true
    });
  }
}
