import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { UnitResponseDto } from "./dto/unit-response.dto";
import { Unit } from "src/entities/unit.entity";
import { User } from "src/entities/user.entity";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { plainToInstance } from "class-transformer";

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async generateUnitCode(): Promise<number> {
    const count = await this.unitRepository.count();
    return count + 1;
  }
  async create(
    createUnitDto: CreateUnitDto,
    currentUser?: User
  ): Promise<UnitResponseDto> {
    try {
      // Validate representative if provided
      if (createUnitDto.representativeId) {
        const representative = await this.userRepository.findOne({
          where: { id: createUnitDto.representativeId },
        });
        if (!representative) {
          throw new BadRequestException({
            code: "USER_NOT_FOUND",
            message: "Representative user not found",
          });
        }
      }

      // Generate unit code (count + 1)
      const unitCode = await this.generateUnitCode();

      // Check if unit code already exists (just in case)
      const existingUnit = await this.unitRepository.findOne({
        where: { unitCode },
      });
      if (existingUnit) {
        throw new ConflictException({
          code: "UNIT_CODE_EXISTS",
          message: "Unit code already exists",
        });
      }

      const unit = this.unitRepository.create({
        ...createUnitDto,
        unitCode,
        users: [currentUser],
        createdBy: currentUser,
        status: createUnitDto.status || UnitStatus.ACTIVE,
      });

      const savedUnit = await this.unitRepository.save(unit);
      return plainToInstance(UnitResponseDto, savedUnit, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error("Error creating unit:", error);
      throw error;
    }
  }

  async findAll(): Promise<UnitResponseDto[]> {
    const units = await this.unitRepository.find({
      relations: ["representative", "rooms"],
      order: { createdAt: "DESC" },
    });
    return plainToInstance(UnitResponseDto, units, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { id },
      relations: ["representative", "rooms"],
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateUnitDto: UpdateUnitDto
  ): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    // Validate representative if provided
    if (updateUnitDto.representativeId) {
      const representative = await this.userRepository.findOne({
        where: { id: updateUnitDto.representativeId },
      });
      if (!representative) {
        throw new BadRequestException({
          code: "USER_NOT_FOUND",
          message: "Representative user not found",
        });
      }
    }

    Object.assign(unit, updateUnitDto);
    const unitCode = await this.generateUnitCode();
    unit.unitCode = unitCode;

    const updatedUnit = await this.unitRepository.save(unit);

    return plainToInstance(UnitResponseDto, updatedUnit, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    await this.unitRepository.softDelete(id);
  }

  async findByUnitCode(unitCode: number): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { unitCode },
      relations: ["representative"],
    });

    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }
}
