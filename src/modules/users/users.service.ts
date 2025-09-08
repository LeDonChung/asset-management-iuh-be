import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Unit } from '../../entities/unit.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { errorResponse } from 'src/common/helpers/error-response';
import { ERR_EXISTS, NOT_FOUND } from 'src/common/utils/error-type-response';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Kiểm tra username đã tồn tại
    const existingUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username }
    });
    if (existingUsername) {
      throw new BadRequestException(errorResponse(ERR_EXISTS, `Username '${createUserDto.username}' already exists`));
    }

    // Kiểm tra email đã tồn tại
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });
    if (existingEmail) {
      throw new BadRequestException(errorResponse(ERR_EXISTS, `Email '${createUserDto.email}' already exists`));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Tạo user mới
    const user = this.userRepository.create({
      username: createUserDto.username,
      password: hashedPassword,
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      unitId: createUserDto.unitId,
      phoneNumber: createUserDto.phoneNumber,
      birthDate: createUserDto.birthDate,
      status: createUserDto.status,
    });

    // Kiểm tra và gán unit nếu có
    if (createUserDto.unitId) {
      const unit = await this.unitRepository.findOne({
        where: { id: createUserDto.unitId }
      });
      if (!unit) {
        throw new NotFoundException(errorResponse(NOT_FOUND, `Unit not found`));
      }
    }

    // Kiểm tra và gán roles nếu có
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      const roles = await this.roleRepository.findByIds(createUserDto.roleIds);
      if (roles.length !== createUserDto.roleIds.length) {
        throw new NotFoundException(errorResponse(NOT_FOUND, `Roles not found`));
      }
      user.roles = roles;
    }

    const savedUser = await this.userRepository.save(user);
    
    return this.transformToResponseDto(savedUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      relations: ['roles', 'roles.permissions', 'unit'],
      order: { createdAt: 'DESC' }
    });

    return users.map(this.transformToResponseDto);
  }

  private transformToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      unitId: user.unitId,
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map(role => ({
        id: role.id,
        name: role.name,
        code: role.code,
        permissions: role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          code: permission.code,
        })) ?? [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })) ?? [],
      unit: user.unit ? {
        id: user.unit.id,
        name: user.unit.name,
      } : undefined,
    };
  }
}
