import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryGroupDto } from './dto/create-inventory-group.dto';
import { UpdateInventoryGroupDto } from './dto/update-inventory-group.dto';
import { InventoryGroupResponseDto } from './dto/inventory-group-response.dto';
import { InventoryGroup } from 'src/entities/inventory-group';
import { InventorySub } from 'src/entities/inventory-sub.entity';
import { InventoryGroupMember } from 'src/entities/inventory-group-member.entity';
import { InventoryGroupAssignment } from 'src/entities/inventory-group-assignment';
import { User } from 'src/entities/user.entity';
import { Unit } from 'src/entities/unit.entity';
import { CommitteeRole } from 'src/common/shared/CommitteeRole';
import { InventoryGroupStatus } from 'src/common/shared/InventoryGroupStatus';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InventoryGroupService {
  constructor(
    @InjectRepository(InventoryGroup)
    private inventoryGroupRepository: Repository<InventoryGroup>,
    @InjectRepository(InventorySub)
    private inventorySubRepository: Repository<InventorySub>,
    @InjectRepository(InventoryGroupMember)
    private inventoryGroupMemberRepository: Repository<InventoryGroupMember>,
    @InjectRepository(InventoryGroupAssignment)
    private inventoryGroupAssignmentRepository: Repository<InventoryGroupAssignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  async create(createInventoryGroupDto: CreateInventoryGroupDto, currentUser: User): Promise<InventoryGroupResponseDto> {
    const { leaderId, secretaryId, memberIds, assignments, subInventoryId, ...groupData } = createInventoryGroupDto;

    // Kiểm tra tiểu ban có tồn tại không
    const subInventory = await this.inventorySubRepository.findOne({
      where: { id: subInventoryId }
    });

    if (!subInventory) {
      throw new NotFoundException(`Tiểu ban với ID ${subInventoryId} không tồn tại`);
    }

    // Validate tất cả user IDs
    const allUserIds = [leaderId, secretaryId, ...memberIds];
    const uniqueUserIds = [...new Set(allUserIds)];
    
    if (allUserIds.length !== uniqueUserIds.length) {
      throw new BadRequestException('Không thể có user trùng lặp trong nhóm');
    }

    const users = await this.userRepository.findByIds(uniqueUserIds);
    if (users.length !== uniqueUserIds.length) {
      throw new NotFoundException('Một hoặc nhiều user không tồn tại');
    }

    // Validate tất cả unit IDs trong assignments
    const unitIds = assignments.map(a => a.unitId);
    const uniqueUnitIds = [...new Set(unitIds)];
    
    if (unitIds.length !== uniqueUnitIds.length) {
      throw new BadRequestException('Không thể phân công trùng đơn vị');
    }

    const units = await this.unitRepository.findByIds(uniqueUnitIds);
    if (units.length !== uniqueUnitIds.length) {
      throw new NotFoundException('Một hoặc nhiều đơn vị không tồn tại');
    }

    // Validate ngày tháng trong assignments
    for (const assignment of assignments) {
      const startDate = new Date(assignment.startDate);
      const endDate = new Date(assignment.endDate);
      
      if (startDate >= endDate) {
        throw new BadRequestException(`Ngày bắt đầu phải nhỏ hơn ngày kết thúc cho đơn vị ${assignment.unitId}`);
      }
    }

    // Tạo nhóm
    const newGroup = this.inventoryGroupRepository.create({
      ...groupData,
      subInventoryId,
      createdBy: currentUser.id
    });

    const savedGroup = await this.inventoryGroupRepository.save(newGroup);

    // Tạo thành viên nhóm
    const members = [
      // Trưởng nhóm
      this.inventoryGroupMemberRepository.create({
        userId: leaderId,
        groupId: savedGroup.id,
        role: CommitteeRole.LEADER,
        createdBy: currentUser.id
      }),
      // Thư ký nhóm
      this.inventoryGroupMemberRepository.create({
        userId: secretaryId,
        groupId: savedGroup.id,
        role: CommitteeRole.SECRETARY,
        createdBy: currentUser.id
      }),
      // Các thành viên
      ...memberIds.map(userId => this.inventoryGroupMemberRepository.create({
        userId,
        groupId: savedGroup.id,
        role: CommitteeRole.MEMBER,
        createdBy: currentUser.id
      }))
    ];

    await this.inventoryGroupMemberRepository.save(members);

    // Tạo phân công đơn vị
    const groupAssignments = assignments.map(assignment => 
      this.inventoryGroupAssignmentRepository.create({
        groupId: savedGroup.id,
        unitId: assignment.unitId,
        startDate: new Date(assignment.startDate),
        endDate: new Date(assignment.endDate),
        note: assignment.note,
        createdBy: currentUser.id
      })
    );

    await this.inventoryGroupAssignmentRepository.save(groupAssignments);

    // Lấy thông tin đầy đủ để trả về
    return this.findOne(savedGroup.id);
  }

  async findAll(subId?: string, status?: string): Promise<InventoryGroupResponseDto[]> {
    const queryBuilder = this.inventoryGroupRepository.createQueryBuilder('group')
      .leftJoinAndSelect('group.subInventory', 'subInventory')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('group.assignments', 'assignments')
      .leftJoinAndSelect('assignments.unit', 'unit')
      .orderBy('group.createdAt', 'DESC');

    if (subId) {
      queryBuilder.andWhere('group.subInventoryId = :subId', { subId });
    }

    if (status) {
      queryBuilder.andWhere('group.status = :status', { status });
    }

    const groups = await queryBuilder.getMany();

    return plainToInstance(InventoryGroupResponseDto, groups, {
      excludeExtraneousValues: true
    });
  }

  async findOne(id: string): Promise<InventoryGroupResponseDto> {
    const group = await this.inventoryGroupRepository.findOne({
      where: { id },
      relations: [
        'subInventory', 
        'members', 
        'members.user', 
        'assignments', 
        'assignments.unit'
      ]
    });

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }

    return plainToInstance(InventoryGroupResponseDto, group, {
      excludeExtraneousValues: true
    });
  }

  async update(id: string, updateInventoryGroupDto: UpdateInventoryGroupDto, currentUser: User): Promise<InventoryGroupResponseDto> {
    const { leaderId, secretaryId, memberIds, assignments, ...updateData } = updateInventoryGroupDto;

    const group = await this.inventoryGroupRepository.findOne({
      where: { id },
      relations: ['members', 'assignments']
    });

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }

    // Cập nhật thông tin cơ bản
    Object.assign(group, updateData);
    await this.inventoryGroupRepository.save(group);

    // Nếu có cập nhật thành viên
    if (leaderId || secretaryId || memberIds) {
      // Xóa tất cả thành viên cũ
      await this.inventoryGroupMemberRepository.delete({ groupId: id });

      // Validate và tạo danh sách thành viên mới
      const allUserIds = [];
      if (leaderId) allUserIds.push(leaderId);
      if (secretaryId) allUserIds.push(secretaryId);
      if (memberIds) allUserIds.push(...memberIds);

      const uniqueUserIds = [...new Set(allUserIds)];
      
      if (allUserIds.length !== uniqueUserIds.length) {
        throw new BadRequestException('Không thể có user trùng lặp trong nhóm');
      }

      const users = await this.userRepository.findByIds(uniqueUserIds);
      if (users.length !== uniqueUserIds.length) {
        throw new NotFoundException('Một hoặc nhiều user không tồn tại');
      }

      // Tạo thành viên mới
      const newMembers = [];
      
      if (leaderId) {
        newMembers.push(this.inventoryGroupMemberRepository.create({
          userId: leaderId,
          groupId: id,
          role: CommitteeRole.LEADER,
          createdBy: currentUser.id
        }));
      }

      if (secretaryId) {
        newMembers.push(this.inventoryGroupMemberRepository.create({
          userId: secretaryId,
          groupId: id,
          role: CommitteeRole.SECRETARY,
          createdBy: currentUser.id
        }));
      }

      if (memberIds) {
        newMembers.push(...memberIds.map(userId => this.inventoryGroupMemberRepository.create({
          userId,
          groupId: id,
          role: CommitteeRole.MEMBER,
          createdBy: currentUser.id
        })));
      }

      await this.inventoryGroupMemberRepository.save(newMembers);
    }

    // Nếu có cập nhật phân công
    if (assignments) {
      // Xóa tất cả phân công cũ
      await this.inventoryGroupAssignmentRepository.delete({ groupId: id });

      // Validate units
      const unitIds = assignments.map(a => a.unitId);
      const uniqueUnitIds = [...new Set(unitIds)];
      
      if (unitIds.length !== uniqueUnitIds.length) {
        throw new BadRequestException('Không thể phân công trùng đơn vị');
      }

      const units = await this.unitRepository.findByIds(uniqueUnitIds);
      if (units.length !== uniqueUnitIds.length) {
        throw new NotFoundException('Một hoặc nhiều đơn vị không tồn tại');
      }

      // Validate ngày tháng
      for (const assignment of assignments) {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        
        if (startDate >= endDate) {
          throw new BadRequestException(`Ngày bắt đầu phải nhỏ hơn ngày kết thúc cho đơn vị ${assignment.unitId}`);
        }
      }

      // Tạo phân công mới
      const newAssignments = assignments.map(assignment => 
        this.inventoryGroupAssignmentRepository.create({
          groupId: id,
          unitId: assignment.unitId,
          startDate: new Date(assignment.startDate),
          endDate: new Date(assignment.endDate),
          note: assignment.note,
          createdBy: currentUser.id
        })
      );

      await this.inventoryGroupAssignmentRepository.save(newAssignments);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const group = await this.inventoryGroupRepository.findOne({
      where: { id }
    });

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }

    // Kiểm tra trạng thái có thể xóa không
    if (group.status === InventoryGroupStatus.ACTIVE) {
      throw new BadRequestException('Không thể xóa nhóm đang hoạt động');
    }

    // Xóa các thành viên và phân công trước
    await this.inventoryGroupMemberRepository.delete({ groupId: id });
    await this.inventoryGroupAssignmentRepository.delete({ groupId: id });

    // Xóa nhóm (soft delete)
    await this.inventoryGroupRepository.softDelete(id);
  }

  async findBySub(subId: string): Promise<InventoryGroupResponseDto[]> {
    // Kiểm tra tiểu ban có tồn tại không
    const subInventory = await this.inventorySubRepository.findOne({
      where: { id: subId }
    });

    if (!subInventory) {
      throw new NotFoundException(`Tiểu ban với ID ${subId} không tồn tại`);
    }

    const groups = await this.inventoryGroupRepository.find({
      where: { subInventoryId: subId },
      relations: [
        'subInventory', 
        'members', 
        'members.user', 
        'assignments', 
        'assignments.unit'
      ],
      order: { createdAt: 'DESC' }
    });

    return plainToInstance(InventoryGroupResponseDto, groups, {
      excludeExtraneousValues: true
    });
  }
}
