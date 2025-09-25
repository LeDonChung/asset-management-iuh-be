import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagerPermission } from '../../entities/manager-permission.entity';
import { Permission } from '../../entities/permission.entity';
import { CreateManagerPermissionDto } from './dtos/create-manager-permission.dto';
import { UpdateManagerPermissionDto } from './dtos/update-manager-permission.dto';
import { ManagerPermissionResponseDto, PermissionResponseDto } from './dtos/manager-permission-response.dto';
import { CommonUtils } from 'src/common/utils/common.utils';
import { PERMISSION_CODE_PREFIX } from 'src/common/utils/constants';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(ManagerPermission)
    private readonly managerPermissionRepository: Repository<ManagerPermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createDto: CreateManagerPermissionDto): Promise<ManagerPermissionResponseDto> {
    const managerPermission = this.managerPermissionRepository.create({
      name: createDto.name,
    });

    if (createDto.permissions && createDto.permissions.length > 0) {
      const permissionPromises = createDto.permissions.map(async (permissionName) => {
        let permission = await this.permissionRepository.findOne({
          where: { name: permissionName },
        });
        
        if (!permission) {
          permission = this.permissionRepository.create({
            name: permissionName,
            code: CommonUtils.generateCode(permissionName, PERMISSION_CODE_PREFIX),
          });
          permission = await this.permissionRepository.save(permission);
        }
        
        return permission;
      });
      
      managerPermission.permissions = await Promise.all(permissionPromises);
    }

    const saved = await this.managerPermissionRepository.save(managerPermission);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<ManagerPermissionResponseDto[]> {
    const managerPermissions = await this.managerPermissionRepository.find({
      relations: ['permissions'],
      order: { createdAt: 'DESC' },
    });

    return managerPermissions.map(this.transformToResponseDto);
  }

  async findOne(id: string): Promise<ManagerPermissionResponseDto> {
    const managerPermission = await this.managerPermissionRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!managerPermission) {
      throw new NotFoundException(`Manager permission with ID ${id} not found`);
    }

    return this.transformToResponseDto(managerPermission);
  }

  async update(id: string, updateDto: UpdateManagerPermissionDto): Promise<ManagerPermissionResponseDto> {
    const managerPermission = await this.managerPermissionRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!managerPermission) {
      throw new NotFoundException(`Manager permission with ID ${id} not found`);
    }

    if (updateDto.name) {
      managerPermission.name = updateDto.name;
    }

    if (updateDto.permissions !== undefined) {
      if (updateDto.permissions.length > 0) {
        // Xử lý permissions với cả create mới và update existing dựa vào ID
        const permissionPromises = updateDto.permissions.map(async (permDto) => {
          if (permDto.id) {
            // Update existing permission nếu có ID
            const existingPermission = await this.permissionRepository.findOne({
              where: { id: permDto.id },
            });
            if (existingPermission) {
              existingPermission.name = permDto.name;
              existingPermission.code = CommonUtils.generateCode(permDto.name, PERMISSION_CODE_PREFIX);
              return this.permissionRepository.save(existingPermission);
            } else {
              throw new NotFoundException(`Permission with ID ${permDto.id} not found`);
            }
          } else {
            // Tạo mới permission nếu không có ID
            // Kiểm tra xem đã tồn tại permission với name này chưa
            let permission = await this.permissionRepository.findOne({
              where: { name: permDto.name },
            });
            
            if (!permission) {
              // Tạo mới permission
              permission = this.permissionRepository.create({
                name: permDto.name,
                code: CommonUtils.generateCode(permDto.name, PERMISSION_CODE_PREFIX),
              });
              permission = await this.permissionRepository.save(permission);
            }
            
            return permission;
          }
        });
        
        managerPermission.permissions = await Promise.all(permissionPromises);
      } else {
        managerPermission.permissions = [];
      }
    }

    await this.managerPermissionRepository.save(managerPermission);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const managerPermission = await this.managerPermissionRepository.findOne({
      where: { id },
    });

    if (!managerPermission) {
      throw new NotFoundException(`Manager permission with ID ${id} not found`);
    }

    await this.managerPermissionRepository.softDelete(id);
  }

  private transformToResponseDto(managerPermission: ManagerPermission): ManagerPermissionResponseDto {
    return {
      id: managerPermission.id,
      name: managerPermission.name,
      permissions: managerPermission.permissions?.map(permission => ({
        id: permission.id,
        name: permission.name,
        code: permission.code,
      })) ?? [],
    };
  }
}
