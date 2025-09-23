import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateRfidDto } from './dto/update-rfid.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { Asset, FixedAsset, ToolsEquipment } from 'src/entities/asset.entity';
import { RfidTag } from 'src/entities/rfid-tag.entity';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';
import { plainToClass, plainToInstance } from 'class-transformer';
import { Room } from 'src/entities/room.entity';
import { Category } from 'src/entities/category.entity';
import { User } from 'src/entities/user.entity';
import * as XLSX from 'xlsx';
import { ImportAssetDto, ImportResultDto } from './dto/import-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createAssetDto: CreateAssetDto, currentUser: User): Promise<AssetResponseDto> {
    try {
      let asset: Asset;
      
      // Tạo asset dựa trên type
      if (createAssetDto.type === AssetType.FIXED_ASSET) {
        asset = new FixedAsset();
      } else {
        asset = new ToolsEquipment();
      }

      // Gán các thuộc tính từ DTO
      Object.assign(asset, {
        ...createAssetDto,
        entrydate: new Date(createAssetDto.entrydate),
      });

      // Gán phòng hiện tại nếu có
      if(createAssetDto.currentRoomId != undefined) {
        const room = await this.roomRepository.findOne({ where: { id: createAssetDto.currentRoomId } });
        if (!room) {
          throw new NotFoundException(`Room with ID ${createAssetDto.currentRoomId} not found`);
        }
        asset.currentRoom = room;
      }

      // Gán danh mục nếu có
      if(createAssetDto.categoryId != undefined) {
        const category = await this.categoryRepository.findOne({ where: { id: createAssetDto.categoryId } });
        if (!category) {
          throw new NotFoundException(`Category with ID ${createAssetDto.categoryId} not found`);
        }
        asset.category = category;
      }
      
      // Gán creator
      if(currentUser) {
        asset.creator = currentUser;
      }

      const savedAsset = await this.assetRepository.save(asset);
      return plainToInstance(AssetResponseDto, savedAsset, { excludeExtraneousValues: true });
    } catch (error) {
      throw new BadRequestException('Failed to create asset: ' + error.message);
    }
  }

  async findAll(): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      relations: ['category', 'currentRoom', 'rfidTag'],
    });

    return plainToInstance(AssetResponseDto, assets, { excludeExtraneousValues: true });
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['category', 'currentRoom', 'rfidTag'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Nếu là Fixed Asset, load thêm RFID tag
    if (asset.type === AssetType.FIXED_ASSET) {
      const fixedAsset = asset as FixedAsset;
      const rfidTag = await this.rfidTagRepository.findOne({
        where: { assetId: id }
      });
      if (rfidTag) {
        fixedAsset.rfidTag = rfidTag;
      }
    }

    return plainToInstance(AssetResponseDto, asset, { excludeExtraneousValues: true });
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({ 
      where: { id },
      relations: ['category', 'creator', 'currentRoom']
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    try {
      // Cập nhật thông tin phòng nếu có
      if (updateAssetDto.currentRoomId !== undefined) {
        const room = await this.roomRepository.findOne({ where: { id: updateAssetDto.currentRoomId } });
        if (!room) {
          throw new NotFoundException(`Room with ID ${updateAssetDto.currentRoomId} not found`);
        }
        asset.currentRoom = room;
      }

      // Cập nhật thông tin danh mục nếu có
      if (updateAssetDto.categoryId !== undefined) {
        const category = await this.categoryRepository.findOne({ where: { id: updateAssetDto.categoryId } });
        if (!category) {
          throw new NotFoundException(`Category with ID ${updateAssetDto.categoryId} not found`);
        }
        asset.category = category;
      }

      const updatedAsset = await this.assetRepository.save({
        ...asset,
        ...updateAssetDto,
        entrydate: updateAssetDto.entrydate ? new Date(updateAssetDto.entrydate) : asset.entrydate,
      });

      return plainToInstance(AssetResponseDto, updatedAsset, { excludeExtraneousValues: true });
    } catch (error) {
      throw new BadRequestException('Failed to update asset: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    try {
      await this.assetRepository.softDelete(id);
    } catch (error) {
      throw new BadRequestException('Failed to delete asset: ' + error.message);
    }
  }

  async updateRfidTag(assetId: string, updateRfidDto: UpdateRfidDto): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    // Chỉ Fixed Asset mới có thể có RFID tag
    if (asset.type !== AssetType.FIXED_ASSET) {
      throw new BadRequestException('Only Fixed Assets can have RFID tags');
    }

    try {
      // Kiểm tra xem đã có RFID tag chưa
      const existingRfidTag = await this.rfidTagRepository.findOne({
        where: { assetId: assetId }
      });

      if (existingRfidTag) {
        // Cập nhật RFID tag hiện có
        await this.rfidTagRepository.update(existingRfidTag.rfidId, {
          rfidId: updateRfidDto.rfidId,
          assignedDate: new Date().toISOString(),
        });
      } else {
        // Tạo RFID tag mới
        const rfidTag = this.rfidTagRepository.create({
          rfidId: updateRfidDto.rfidId,
          assetId: assetId,
          assignedDate: new Date().toISOString(),
        });
        await this.rfidTagRepository.save(rfidTag);
      }

      return this.findOne(assetId);
    } catch (error) {
      throw new BadRequestException('Failed to update RFID tag: ' + error.message);
    }
  }

  async removeRfidTag(assetId: string): Promise<void> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    // Kiểm tra xem có RFID tag không
    const existingRfidTag = await this.rfidTagRepository.findOne({
      where: { assetId: assetId }
    });

    if (!existingRfidTag) {
      throw new BadRequestException('Asset does not have an RFID tag');
    }

    try {
      await this.rfidTagRepository.delete(existingRfidTag.rfidId);
    } catch (error) {
      throw new BadRequestException('Failed to remove RFID tag: ' + error.message);
    }
  }

  async importFromExcel(file: Express.Multer.File, currentUser: User): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      totalProcessed: 0,
      totalBatches: 0,
      batchSize: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdAssets: [],
    };

    try {
      // Đọc file Excel
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Chuyển đổi thành JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Bỏ qua header row (row đầu tiên)
      const dataRows = jsonData.slice(1);
      result.totalProcessed = dataRows.length;

      // Validation số lượng tài sản
      if (dataRows.length === 0) {
        throw new BadRequestException('File Excel không có dữ liệu tài sản');
      }

      // Xử lý import theo batch (5-10 dòng một lần)
      const batchSize = Math.min(10, Math.max(5, dataRows.length));
      const batches = [];
      
      for (let i = 0; i < dataRows.length; i += batchSize) {
        batches.push(dataRows.slice(i, i + batchSize));
      }

      // Set thông tin batch
      result.batchSize = batchSize;
      result.totalBatches = batches.length;

      // Xử lý từng batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} assets`);
        
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = (batchIndex * batchSize) + i + 2; // +2 vì bỏ qua header và index bắt đầu từ 0

          try {
          // Mapping dữ liệu từ Excel theo cấu trúc bạn cung cấp (13 cột A-M)
          const assetData: ImportAssetDto = {
            ktCode: row[0]?.toString() || '', // A: Mã kế toán
            fixedCode: row[1]?.toString() || '', // B: Mã tài sản
            location: row[2]?.toString() || '', // C: Vị trí
            name: row[3]?.toString() || '', // D: Tên tài sản
            type: this.mapAssetType(row[4]?.toString() || ''), // E: Loại tài sản
            category: row[5]?.toString() || '', // F: Danh mục
            specs: row[6]?.toString() || '', // G: Thông số KT
            origin: row[7]?.toString() || '', // H: Nước SX
            unit: row[8]?.toString() || 'Cái', // I: ĐVT
            quantity: parseInt(row[9]?.toString()) || 1, // J: Số lượng
            entrydate: this.formatDate(row[10]?.toString() || ''), // K: Ngày nhập
            purchasePackage: parseInt(row[11]?.toString()) || 0, // L: Gói mua
            rfidId: row[12]?.toString() || '', // M: RFID Tag nếu có
            status: AssetStatus.IN_USE,
          };

          // Validation cơ bản
          if (!assetData.ktCode || !assetData.fixedCode || !assetData.name) {
            throw new Error('Mã kế toán, mã tài sản và tên tài sản là bắt buộc');
          }

          // Tìm room theo location code
          let currentRoomId: string | undefined;
          if (assetData.location) {
            const room = await this.roomRepository.findOne({
              where: { roomCode: assetData.location }
            });
            if (room) {
              currentRoomId = room.id;
            }
          }

          // Tìm hoặc tạo category
          let categoryId: string;
          
          if (assetData.category && assetData.category.trim()) {
            // Tìm category theo tên
            let existingCategory = await this.categoryRepository.findOne({
              where: { name: assetData.category.trim() }
            });
            
            if (!existingCategory) {
              // Tạo category mới nếu chưa có
              const newCategory = this.categoryRepository.create({
                name: assetData.category.trim(),
                code: this.generateCategoryCode(assetData.category.trim()),
              });
              existingCategory = await this.categoryRepository.save(newCategory);
            }
            
            categoryId = existingCategory.id;
          } else {
            // Sử dụng category mặc định nếu không có danh mục
            const defaultCategory = await this.categoryRepository.findOne({
              where: { code: 'DEFAULT' }
            });
            
            if (defaultCategory) {
              categoryId = defaultCategory.id;
            } else {
              // Tạo category mặc định nếu chưa có
              const newCategory = this.categoryRepository.create({
                name: 'Danh mục mặc định',
                code: 'DEFAULT',
              });
              const savedCategory = await this.categoryRepository.save(newCategory);
              categoryId = savedCategory.id;
            }
          }

          // Tạo asset
          const createAssetDto = {
            ...assetData,
            currentRoomId,
            categoryId,
          };

          const createdAsset = await this.create(createAssetDto, currentUser);
          
          // Xử lý RFID tag nếu có và là Fixed Asset
          if (assetData.rfidId && assetData.rfidId.trim() && assetData.type === AssetType.FIXED_ASSET) {
            try {
              // Kiểm tra xem RFID tag đã tồn tại chưa
              const existingRfid = await this.rfidTagRepository.findOne({
                where: { rfidId: assetData.rfidId.trim() }
              });

              if (!existingRfid) {
                // Tạo RFID tag mới
                const rfidTag = this.rfidTagRepository.create({
                  rfidId: assetData.rfidId.trim(),
                  assetId: createdAsset.id,
                  assignedDate: new Date().toISOString(),
                });
                await this.rfidTagRepository.save(rfidTag);
              } else {
                // RFID tag đã tồn tại, có thể log warning hoặc skip
                console.warn(`RFID tag ${assetData.rfidId} already exists for asset ${existingRfid.assetId}`);
              }
            } catch (rfidError) {
              // Log lỗi RFID nhưng không fail toàn bộ import
              console.error(`Failed to create RFID tag for asset ${createdAsset.id}:`, rfidError.message);
            }
          }
          
          result.successCount++;
          result.createdAssets.push({
            id: createdAsset.id,
            name: createdAsset.name,
            ktCode: createdAsset.ktCode,
            fixedCode: createdAsset.fixedCode,
            type: createdAsset.type,
            category: assetData.category || 'Danh mục mặc định',
            rfidTag: assetData.rfidId || undefined,
          });

          } catch (error) {
            result.errorCount++;
            result.errors.push({
              row: rowNumber,
              message: error.message,
              data: row,
            });
          }
        }
        
        // Thêm delay nhỏ giữa các batch để tránh overload database
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException('Failed to import Excel file: ' + error.message);
    }
  }

  private mapAssetType(typeString: string): AssetType {
    const type = typeString.toLowerCase().trim();
    if (type.includes('tài sản cố định') || type.includes('fixed asset')) {
      return AssetType.FIXED_ASSET;
    } else if (type.includes('công cụ dụng cụ') || type.includes('tools') || type.includes('equipment')) {
      return AssetType.TOOLS_EQUIPMENT;
    }
    return AssetType.FIXED_ASSET; // Default
  }

  private formatDate(dateString: string): string {
    try {
      // Xử lý các định dạng ngày khác nhau
      if (dateString.includes('/')) {
        // DD/MM/YYYY hoặc MM/DD/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // Giả sử định dạng DD/MM/YYYY
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      } else if (dateString.includes('-')) {
        // YYYY-MM-DD hoặc DD-MM-YYYY
        return dateString;
      } else if (dateString.length === 8) {
        // YYYYMMDD
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      
      // Nếu không parse được, trả về ngày hiện tại
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  private generateCategoryCode(categoryName: string): string {
    // Tạo code từ tên category
    // Loại bỏ dấu và chuyển thành chữ hoa
    const code = categoryName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
      .replace(/[^a-zA-Z0-9\s]/g, '') // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, '_') // Thay thế khoảng trắng bằng underscore
      .toUpperCase()
      .substring(0, 20); // Giới hạn độ dài
    
    return code || 'CATEGORY_' + Date.now();
  }
}
