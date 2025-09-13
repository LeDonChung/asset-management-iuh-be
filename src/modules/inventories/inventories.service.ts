import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventorySessionResponseDto } from './dto/inventory-response.dto';
import { InventorySession } from 'src/entities/inventory-session.entity';
import { FileUrl } from 'src/entities/file-url.entity';
import { InventorySessionUnit } from 'src/entities/inventory-session-unit.entity';
import { Unit } from 'src/entities/unit.entity';
import { User } from 'src/entities/user.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(InventorySession)
    private inventorySessionRepository: Repository<InventorySession>,
    @InjectRepository(FileUrl)
    private fileUrlRepository: Repository<FileUrl>,
    @InjectRepository(InventorySessionUnit)
    private inventorySessionUnitRepository: Repository<InventorySessionUnit>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  async create(createInventoryDto: CreateInventoryDto, currentUser?: User): Promise<InventorySessionResponseDto> {
    const { fileUrls, unitIds, ...inventoryData } = createInventoryDto;

    // Validation: Kiểm tra người tạo có tồn tại không
    if (!currentUser) {
      throw new UnauthorizedException('Người dùng không hợp lệ');
    }

    // Validation: Kiểm tra ngày bắt đầu và kết thúc
    const startDate = new Date(inventoryData.startDate);
    const endDate = new Date(inventoryData.endDate);
    
    if (startDate >= endDate) {
      throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Ngày bắt đầu không được nhỏ hơn ngày hiện tại');
    }

    // Validation: Kiểm tra tên kỳ kiểm kê đã tồn tại trong năm này chưa
    const existingSession = await this.inventorySessionRepository.findOne({
      where: {
        year: inventoryData.year,
        period: inventoryData.period,
      },
    });

    if (existingSession) {
      throw new BadRequestException(`Kỳ kiểm kê "${inventoryData.name}" đã tồn tại trong năm ${inventoryData.year}`);
    }

    // Validation: Kiểm tra units nếu có
    if (unitIds && unitIds.length > 0) {
      const units = await this.unitRepository.findBy({ id: In(unitIds) });
      if (units.length !== unitIds.length) {
        throw new BadRequestException('Một hoặc nhiều đơn vị không tồn tại');
      }

      // Kiểm tra tất cả units phải là CAMPUS
      const nonCampusUnits = units.filter(unit => unit.type !== 'Campus');
      if (nonCampusUnits.length > 0) {
        throw new BadRequestException('Chỉ được chọn các đơn vị loại CAMPUS');
      }
    }

    // Validation: Kiểm tra format URL nếu có
    if (fileUrls && fileUrls.length > 0) {
      const urlRegex = /^https?:\/\/.+/;
      const invalidUrls = fileUrls.filter(url => !urlRegex.test(url));
      if (invalidUrls.length > 0) {
        throw new BadRequestException('Một hoặc nhiều URL hình ảnh không hợp lệ');
      }
    }

    // Tạo inventory session
    const inventorySession = this.inventorySessionRepository.create({
      ...inventoryData,
      startDate,
      endDate,
      createdBy: currentUser.id,
    });

    // Tạo file URLs nếu có
    let fileUrlsSave: FileUrl[] = [];
    if (fileUrls && fileUrls.length > 0) {
      fileUrlsSave = fileUrls.map(url => {
        const fileUrl = this.fileUrlRepository.create({ url });
        return fileUrl;
      });
    }

    // Gán fileUrls trước
    inventorySession.fileUrls = fileUrlsSave;

    // Lưu inventory session trước để có ID
    const savedSession = await this.inventorySessionRepository.save(inventorySession);

    // Tạo inventory session units với sessionId đã có
    if (unitIds && unitIds.length > 0) {
      const inventorySessionUnits = unitIds.map(unitId => 
        this.inventorySessionUnitRepository.create({
          sessionId: savedSession.id,
          unitId
        })
      );
      await this.inventorySessionUnitRepository.save(inventorySessionUnits);
    }

    return this.findOne(savedSession.id);
  }

  async findAll(): Promise<InventorySessionResponseDto[]> {
    const sessions = await this.inventorySessionRepository.find({
      relations: ['creator', 'fileUrls', 'inventorySessionUnits', 'inventorySessionUnits.unit'],
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(InventorySessionResponseDto, sessions, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<InventorySessionResponseDto> {
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: ['creator', 'fileUrls', 'inventorySessionUnits', 'inventorySessionUnits.unit'],
    });

    if (!inventorySession) {
      throw new NotFoundException(`Inventory session với ID ${id} không tồn tại`);
    }

    return plainToInstance(InventorySessionResponseDto, inventorySession, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto): Promise<InventorySessionResponseDto> {
    const { fileUrls, unitIds, ...updateData } = updateInventoryDto;

    // Kiểm tra inventory session có tồn tại không
    const existingSession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: ['fileUrls', 'inventorySessionUnits'],
    });

    if (!existingSession) {
      throw new NotFoundException(`Inventory session với ID ${id} không tồn tại`);
    }

    // Validation: Kiểm tra ngày bắt đầu và kết thúc nếu có cập nhật
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingSession.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingSession.endDate;
      
      if (startDate >= endDate) {
        throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
      }

      if (startDate < new Date()) {
        throw new BadRequestException('Ngày bắt đầu không được nhỏ hơn ngày hiện tại');
      }
    }

    // Validation: Kiểm tra tên kỳ kiểm kê đã tồn tại trong năm này chưa (nếu có cập nhật tên)
    if (updateData.name && updateData.name !== existingSession.name) {
      const year = updateData.year || existingSession.year;
      const existingSessionWithSamePeriod = await this.inventorySessionRepository.findOne({
        where: {
          period: updateData.period,
          year: year,
        },
      });

      if (existingSessionWithSamePeriod && existingSessionWithSamePeriod.id !== id) {
        throw new BadRequestException(`Kỳ kiểm kê "${updateData.name}" đã tồn tại trong năm ${year}`);
      }
    }

    // Validation: Kiểm tra units nếu có cập nhật
    if (unitIds !== undefined) {
      if (unitIds.length > 0) {
        const units = await this.unitRepository.findBy({ id: In(unitIds) });
        if (units.length !== unitIds.length) {
          throw new BadRequestException('Một hoặc nhiều đơn vị không tồn tại');
        }

        // Kiểm tra tất cả units phải là CAMPUS
        const nonCampusUnits = units.filter(unit => unit.type !== 'Campus');
        if (nonCampusUnits.length > 0) {
          throw new BadRequestException('Chỉ được chọn các đơn vị loại CAMPUS');
        }
      }
    }

    // Validation: Kiểm tra format URL nếu có cập nhật
    if (fileUrls !== undefined && fileUrls.length > 0) {
      const urlRegex = /^https?:\/\/.+/;
      const invalidUrls = fileUrls.filter(url => !urlRegex.test(url));
      if (invalidUrls.length > 0) {
        throw new BadRequestException('Một hoặc nhiều URL hình ảnh không hợp lệ');
      }
    }

    // Cập nhật thông tin cơ bản
    if (Object.keys(updateData).length > 0) {
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate) as any;
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate) as any;
      }
      
      Object.assign(existingSession, updateData);
    }

    // Xử lý file URLs
    if (fileUrls !== undefined) {
      // Xóa các file URLs cũ
      if (existingSession.fileUrls && existingSession.fileUrls.length > 0) {
        await this.fileUrlRepository.remove(existingSession.fileUrls);
      }

      // Tạo file URLs mới nếu có
      if (fileUrls.length > 0) {
        const newFileUrls = fileUrls.map(url => this.fileUrlRepository.create({ url }));
        existingSession.fileUrls = newFileUrls;
      } else {
        existingSession.fileUrls = [];
      }
    }

    

    // Save tất cả trong một lần
    const savedSession = await this.inventorySessionRepository.save(existingSession);
    // Xử lý units
    if (unitIds !== undefined) {
      // Xóa các inventory session units cũ
      if (existingSession.inventorySessionUnits && existingSession.inventorySessionUnits.length > 0) {
        await this.inventorySessionUnitRepository.remove(existingSession.inventorySessionUnits);
      }

      // Tạo inventory session units mới nếu có
      if (unitIds && unitIds.length > 0) {
        const inventorySessionUnits = unitIds.map(unitId => 
          this.inventorySessionUnitRepository.create({
            inventorySession: existingSession,
            unitId,
          })
        );
        await this.inventorySessionUnitRepository.save(inventorySessionUnits);
      }
    }
    return this.findOne(savedSession.id);
  }

  async remove(id: string): Promise<void> {
    // Kiểm tra inventory session có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: ['fileUrls', 'inventorySessionUnits'],
    });

    if (!inventorySession) {
      throw new NotFoundException(`Inventory session với ID ${id} không tồn tại`);
    }

    // Validation: Kiểm tra trạng thái có thể xóa không
    if (inventorySession.status === 'IN_PROGRESS') {
      throw new BadRequestException('Không thể xóa kỳ kiểm kê đang trong quá trình thực hiện');
    }

    // Xóa các file URLs liên quan
    if (inventorySession.fileUrls && inventorySession.fileUrls.length > 0) {
      await this.fileUrlRepository.remove(inventorySession.fileUrls);
    }

    // Xóa các inventory session units liên quan
    if (inventorySession.inventorySessionUnits && inventorySession.inventorySessionUnits.length > 0) {
      await this.inventorySessionUnitRepository.remove(inventorySession.inventorySessionUnits);
    }

    // Xóa inventory session (soft delete)
    await this.inventorySessionRepository.softDelete(id);
  }
}
