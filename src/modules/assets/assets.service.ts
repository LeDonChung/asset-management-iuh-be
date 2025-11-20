import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindManyOptions, In } from "typeorm";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { UpdateRfidDto } from "./dto/update-rfid.dto";
import { AssetResponseDto } from "./dto/asset-response.dto";
import { ClassifyRfidsResponseDto } from "./dto/classify-rfids-response.dto";
import { WarehouseAssetFilterDto } from "./dto/warehouse-asset-filter.dto";
import { WarehouseAssetResponseDto } from "./dto/warehouse-asset-response.dto";
import { UnidentifiedAssetFilterDto } from "./dto/unidentified-asset-filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";
import { FieldType } from "src/common/dto/filter.dto";
import { Asset, FixedAsset, ToolsEquipment } from "src/entities/asset.entity";
import { RfidTag } from "src/entities/rfid-tag.entity";
import { AssetType } from "src/common/shared/AssetType";
import { AssetStatus } from "src/common/shared/AssetStatus";
import { plainToClass, plainToInstance } from "class-transformer";
import { Room } from "src/entities/room.entity";
import { Category } from "src/entities/category.entity";
import { User } from "src/entities/user.entity";
import { Unit } from "src/entities/unit.entity";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { TransactionStatus } from "src/common/shared/TransactionStatus";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import * as XLSX from "xlsx";
import { ImportAssetDto, ImportResultDto } from "./dto/import-asset.dto";
import { BulkLocationUpdateDto, BulkLocationUpdateResultDto } from "./dto/bulk-location-update.dto";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { AssetBook } from "src/entities/asset-book.entity";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";

@Injectable()
export class AssetsService {
  private readonly DEBUG_MODE = process.env.NODE_ENV === 'development' && process.env.DEBUG_ASSETS === 'true';

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(AssetBookItem)
    private readonly assetBookItemRepository: Repository<AssetBookItem>,
    @InjectRepository(AssetBook)
    private readonly assetBookRepository: Repository<AssetBook>,
    private readonly permissionHelper: PermissionHelperService,
  ) {}

  /**
   * Log debug thông tin chỉ khi DEBUG_MODE được bật
   */
  private debugLog(message: string, ...args: any[]): void {
    if (this.DEBUG_MODE) {
      console.log(message, ...args);
    }
  }

  async findByRfids(
    rfids: string[]
  ): Promise<{ rfid: string; allowMove: boolean }[]> {
    const rfidTags = await this.rfidTagRepository.find({
      where: { rfidId: In(rfids) },
      relations: ["asset"],
    });

    return rfidTags.map((rfid) => ({
      rfid: rfid.rfidId,
      allowMove: rfid.asset?.allowMove ?? false,
    }));
  }

  /**
   * Generate ktCode theo định dạng: xx-yyyy/nn
   * xx: số năm đưa vào sử dụng (ví dụ: 19 cho năm 2019, 25 cho năm 2025)
   * yyyy: mã danh mục lấy từ category.code
   * nn: gói mua (bắt đầu từ 00)
   */
  private async generateKtCode(yearPrefix: string, categoryId?: string, purchasePackage = 0): Promise<string> {
    const nn = purchasePackage.toString().padStart(2, '0');
    
    // Lấy 2 chữ số cuối của năm nhập
    const currentYear = new Date().getFullYear();
    const xx = currentYear.toString().slice(-2); // Ví dụ: 2025 -> 25
    
    // Lấy mã danh mục từ category.code
    let yyyy = '0000'; // Mặc định
    if (categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (category && category.code) {
        // Lấy 4 chữ số từ category.code, nếu không đủ thì pad
        const digits = category.code.replace(/\D/g, ''); // Loại bỏ ký tự không phải số
        if (digits.length >= 4) {
          yyyy = digits.substring(0, 4);
        } else if (digits.length > 0) {
          yyyy = digits.padStart(4, '0');
        } else {
          // Nếu không có số trong code, dùng hash của tên category
          yyyy = Math.abs(category.code.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0)).toString().padStart(4, '0').substring(0, 4);
        }
      }
    }
    
    return `${xx}-${yyyy}/${nn}`;
  }

  /**
   * Generate fixedCode theo định dạng: xxxx.yyyyy
   * xxxx: mã danh mục lấy từ category.code
   * yyyyy: số thứ tự = số tài sản hiện có trong danh mục + 1
   */
  private async generateFixedCode(categoryId?: string): Promise<string> {
    // Lấy mã danh mục từ category.code
    let categoryPrefix = '10000'; // Mặc định
    if (categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (category && category.code) {
        // Sử dụng category.code làm prefix
        const digits = category.code.replace(/\D/g, ''); // Lấy chỉ số
        if (digits.length >= 4) {
          categoryPrefix = digits.substring(0, 4);
        } else if (digits.length > 0) {
          categoryPrefix = digits.padStart(4, '0');
        } else {
          // Nếu code không có số, tạo từ hash tên category
          categoryPrefix = Math.abs(category.code.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0)).toString().padStart(4, '0').substring(0, 4);
        }
      }
    }

    // Đếm số tài sản hiện có trong danh mục này + 1
    const assetCount = await this.assetRepository.count({
      where: { categoryId: categoryId }
    });
    
    const nextSeq = assetCount + 1;
    const seqPart = nextSeq.toString().padStart(5, '0');
    
    return `${categoryPrefix}.${seqPart}`;
  }

  async create(
    createAssetDto: CreateAssetDto,
    currentUser: User
  ): Promise<AssetResponseDto> {
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

      // Nếu ktCode không có, tự sinh theo quy tắc xx-yyyy/nn
      if (!createAssetDto.ktCode) {
        asset.ktCode = await this.generateKtCode('', createAssetDto.categoryId, createAssetDto.purchasePackage ?? 0);
      }

      // Nếu fixedCode không có, tự sinh theo quy tắc xxxx.yyyy (xxxx là mã danh mục, yyyy là sequence)
      if (!createAssetDto.fixedCode) {
        asset.fixedCode = await this.generateFixedCode(createAssetDto.categoryId);
      }

      // Gán phòng hiện tại nếu có (không bắt buộc khi tạo từ asset-books)
      if (createAssetDto.currentRoomId != undefined) {
        const room = await this.roomRepository.findOne({
          where: { id: createAssetDto.currentRoomId },
        });
        if (!room) {
          throw new NotFoundException(
            `Room with ID ${createAssetDto.currentRoomId} not found`
          );
        }
        asset.currentRoom = room;
      }

      // Gán danh mục nếu có
      if (createAssetDto.categoryId != undefined) {
        const category = await this.categoryRepository.findOne({
          where: { id: createAssetDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${createAssetDto.categoryId} not found`
          );
        }
        asset.category = category;
      }

      // Gán creator
      if (currentUser) {
        asset.creator = currentUser;
      }

      // Xử lý RFID nếu được cung cấp
      if (createAssetDto.rfid && asset.type === AssetType.FIXED_ASSET) {
        // Kiểm tra RFID đã tồn tại chưa
        const existingRfid = await this.rfidTagRepository.findOne({
          where: { rfidId: createAssetDto.rfid },
          relations: ['asset']
        });
        
        if (existingRfid && existingRfid.asset) {
          throw new BadRequestException(`RFID ${createAssetDto.rfid} đã được gán cho tài sản khác`);
        }
        
        // Tạo hoặc cập nhật RFID tag
        let rfidTag: RfidTag;
        if (existingRfid) {
          rfidTag = existingRfid;
        } else {
          rfidTag = new RfidTag();
          rfidTag.rfidId = createAssetDto.rfid;
          rfidTag.assignedDate = new Date().toISOString();
        }
        
        // Lưu asset trước
        const savedAsset = await this.assetRepository.save(asset);
        
        // Gán asset cho RFID và lưu
        rfidTag.asset = savedAsset;
        rfidTag.assetId = savedAsset.id;
        await this.rfidTagRepository.save(rfidTag);
        
        // Cập nhật status thành IN_USE khi có RFID
        savedAsset.status = AssetStatus.IN_USE;
        return plainToInstance(AssetResponseDto, await this.assetRepository.save(savedAsset), {
          excludeExtraneousValues: true,
        });
      }

      // Nếu là FIXED_ASSET và chưa có RFID, set status = UNIDENTIFIED
      if (asset.type === AssetType.FIXED_ASSET && !createAssetDto.rfid) {
        asset.status = AssetStatus.UNIDENTIFIED;
      }

      const savedAsset = await this.assetRepository.save(asset);
      return plainToInstance(AssetResponseDto, savedAsset, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new BadRequestException("Failed to create asset: " + error.message);
    }
  }

  async findAll(): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      relations: ["category", "currentRoom", "rfidTag"],
    });

    return plainToInstance(AssetResponseDto, assets, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: [
        "category",
        "currentRoom",
        "currentRoom.unit",
        "rfidTag",
        "transactionItems",
        "transactionItems.transaction",
        "transactionItems.transaction.fromUnit",
        "transactionItems.transaction.toUnit",
        "transactionItems.fromRoom",
        "transactionItems.toRoom",
      ],
      order: {
        transactionItems: {
          createdAt: "DESC",
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Nếu là Fixed Asset, load thêm RFID tag
    if (asset.type === AssetType.FIXED_ASSET) {
      const fixedAsset = asset as FixedAsset;
      const rfidTag = await this.rfidTagRepository.findOne({
        where: { assetId: id },
      });
      if (rfidTag) {
        fixedAsset.rfidTag = rfidTag;
      }
    }

    return plainToInstance(AssetResponseDto, asset, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
    currentUser?: User
  ): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ["category", "creator", "currentRoom", "currentRoom.unit", "rfidTag"],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    try {
      // Kiểm tra nếu tài sản đã có phòng sử dụng thì không cho cập nhật một số thông tin quan trọng
      const hasCurrentRoom = asset.currentRoom !== null;
      
      if (hasCurrentRoom) {
        // Danh sách các trường không được phép cập nhật khi tài sản đã có phòng sử dụng
        const restrictedFields = ['type', 'categoryId', 'ktCode', 'fixedCode'];
        
        for (const field of restrictedFields) {
          if (updateAssetDto[field] !== undefined && updateAssetDto[field] !== asset[field]) {
            throw new BadRequestException(
              `Không thể cập nhật ${field} khi tài sản đã được phân bổ cho phòng sử dụng. Vui lòng thu hồi tài sản trước khi cập nhật.`
            );
          }
        }

        // Không cho phép thay đổi RFID khi đã có phòng sử dụng
        if (updateAssetDto.rfid !== undefined) {
          const currentRfid = asset.type === AssetType.FIXED_ASSET 
            ? (asset as FixedAsset).rfidTag?.rfidId 
            : null;
          
          if (updateAssetDto.rfid !== currentRfid) {
            throw new BadRequestException(
              'Không thể cập nhật mã RFID khi tài sản đã được phân bổ cho phòng sử dụng. Vui lòng thu hồi tài sản trước khi cập nhật.'
            );
          }
        }

        this.debugLog(`Asset ${id} has current room, restricting updates to basic info only`);
      }

      // Cập nhật thông tin phòng nếu có
      if (updateAssetDto.currentRoomId !== undefined) {
        if (updateAssetDto.currentRoomId === null || updateAssetDto.currentRoomId === '') {
          // Cho phép xóa phòng (thu hồi tài sản)
          asset.currentRoom = null;
        } else {
          const room = await this.roomRepository.findOne({
            where: { id: updateAssetDto.currentRoomId },
          });
          if (!room) {
            throw new NotFoundException(
              `Room with ID ${updateAssetDto.currentRoomId} not found`
            );
          }
          asset.currentRoom = room;
        }
      }

      // Cập nhật thông tin danh mục nếu có (chỉ khi chưa có phòng sử dụng)
      if (updateAssetDto.categoryId !== undefined && !hasCurrentRoom) {
        const category = await this.categoryRepository.findOne({
          where: { id: updateAssetDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${updateAssetDto.categoryId} not found`
          );
        }
        asset.category = category;
      }

      // Xử lý RFID cho tài sản cố định (chỉ khi chưa có phòng sử dụng)
      if (updateAssetDto.rfid !== undefined && asset.type === AssetType.FIXED_ASSET && !hasCurrentRoom) {
        if (updateAssetDto.rfid) {
          // Kiểm tra RFID đã tồn tại chưa
          const existingRfid = await this.rfidTagRepository.findOne({
            where: { rfidId: updateAssetDto.rfid },
            relations: ['asset']
          });
          
          if (existingRfid && existingRfid.asset && existingRfid.asset.id !== id) {
            throw new BadRequestException(`RFID ${updateAssetDto.rfid} đã được gán cho tài sản khác`);
          }
          
          // Xóa RFID cũ nếu có
          const currentRfid = await this.rfidTagRepository.findOne({
            where: { assetId: id }
          });
          if (currentRfid) {
            await this.rfidTagRepository.remove(currentRfid);
          }

          // Tạo hoặc cập nhật RFID mới
          let rfidTag: RfidTag;
          if (existingRfid) {
            rfidTag = existingRfid;
          } else {
            rfidTag = new RfidTag();
            rfidTag.rfidId = updateAssetDto.rfid;
            rfidTag.assignedDate = new Date().toISOString();
          }
          
          rfidTag.asset = asset;
          rfidTag.assetId = asset.id;
          await this.rfidTagRepository.save(rfidTag);
          
          // Cập nhật status thành IN_USE khi có RFID
          asset.status = AssetStatus.IN_USE;
        } else {
          // Xóa RFID nếu rfid = ''
          const currentRfid = await this.rfidTagRepository.findOne({
            where: { assetId: id }
          });
          if (currentRfid) {
            await this.rfidTagRepository.remove(currentRfid);
          }
          
          // Set status về UNIDENTIFIED nếu không có phòng
          if (!asset.currentRoom) {
            asset.status = AssetStatus.UNIDENTIFIED;
          }
        }
      }

      // Cập nhật thông tin cơ bản (luôn được phép)
      const allowedFields = ['name', 'specs', 'entrydate', 'locationInRoom', 'unit', 'quantity', 'origin', 'purchasePackage', 'status'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (updateAssetDto[field] !== undefined) {
          if (field === 'entrydate') {
            updateData[field] = new Date(updateAssetDto[field]);
          } else {
            updateData[field] = updateAssetDto[field];
          }
        }
      }

      // Cập nhật các trường được phép (khi chưa có phòng sử dụng)
      if (!hasCurrentRoom) {
        const additionalFields = ['type', 'ktCode', 'fixedCode'];
        for (const field of additionalFields) {
          if (updateAssetDto[field] !== undefined) {
            updateData[field] = updateAssetDto[field];
          }
        }
      }

      const updatedAsset = await this.assetRepository.save({
        ...asset,
        ...updateData,
      });

      this.debugLog(`Asset ${id} updated successfully. HasCurrentRoom: ${hasCurrentRoom}`);

      return plainToInstance(AssetResponseDto, updatedAsset, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new BadRequestException("Failed to update asset: " + error.message);
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
      throw new BadRequestException("Failed to delete asset: " + error.message);
    }
  }

  async updateRfidTag(
    assetId: string,
    updateRfidDto: UpdateRfidDto
  ): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    // Chỉ Fixed Asset mới có thể có RFID tag
    if (asset.type !== AssetType.FIXED_ASSET) {
      throw new BadRequestException("Only Fixed Assets can have RFID tags");
    }

    try {
      // Kiểm tra xem đã có RFID tag chưa
      const existingRfidTag = await this.rfidTagRepository.findOne({
        where: { assetId: assetId },
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
      throw new BadRequestException(
        "Failed to update RFID tag: " + error.message
      );
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
      where: { assetId: assetId },
    });

    if (!existingRfidTag) {
      throw new BadRequestException("Asset does not have an RFID tag");
    }

    try {
      await this.rfidTagRepository.delete(existingRfidTag.rfidId);
    } catch (error) {
      throw new BadRequestException(
        "Failed to remove RFID tag: " + error.message
      );
    }
  }

  async importFromExcel(
    file: Express.Multer.File,
    currentUser: User
  ): Promise<ImportResultDto> {
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
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Chuyển đổi thành JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Bỏ qua header row (row đầu tiên)
      const dataRows = jsonData.slice(1);
      result.totalProcessed = dataRows.length;

      // Validation số lượng tài sản
      if (dataRows.length === 0) {
        throw new BadRequestException("File Excel không có dữ liệu tài sản");
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
        console.log(
          `Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} assets`
        );

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = batchIndex * batchSize + i + 2; // +2 vì bỏ qua header và index bắt đầu từ 0

          try {
            // Mapping dữ liệu từ Excel theo cấu trúc bạn cung cấp (13 cột A-M, có thể mở rộng thêm N)
            const assetData: ImportAssetDto = {
              ktCode: row[0]?.toString() || "", // A: Mã kế toán
              fixedCode: row[1]?.toString() || "", // B: Mã tài sản
              location: row[2]?.toString() || "", // C: Vị trí
              name: row[3]?.toString() || "", // D: Tên tài sản
              type: this.mapAssetType(row[4]?.toString() || ""), // E: Loại tài sản
              category: row[5]?.toString() || "", // F: Danh mục
              specs: row[6]?.toString() || "", // G: Thông số KT
              origin: row[7]?.toString() || "", // H: Nước SX
              unit: row[8]?.toString() || "Cái", // I: ĐVT
              quantity: parseInt(row[9]?.toString()) || 1, // J: Số lượng
              entrydate: this.formatDate(row[10]?.toString() || ""), // K: Ngày nhập
              purchasePackage: parseInt(row[11]?.toString()) || 0, // L: Gói mua
              rfidId: row[12]?.toString() || "", // M: RFID Tag nếu có
              locationInRoom: row[13]?.toString() || "", // N: Vị trí cụ thể trong phòng (tùy chọn)
              status: AssetStatus.IN_USE,
            };

            // Validation cơ bản
            if (!assetData.ktCode || !assetData.fixedCode || !assetData.name) {
              throw new Error(
                "Mã kế toán, mã tài sản và tên tài sản là bắt buộc"
              );
            }

            // Tìm room theo location code
            let currentRoomId: string | undefined;
            if (assetData.location) {
              const room = await this.roomRepository.findOne({
                where: { roomCode: assetData.location },
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
                where: { name: assetData.category.trim() },
              });

              if (!existingCategory) {
                // Tạo category mới nếu chưa có
                const newCategory = this.categoryRepository.create({
                  name: assetData.category.trim(),
                  code: this.generateCategoryCode(assetData.category.trim()),
                });
                existingCategory =
                  await this.categoryRepository.save(newCategory);
              }

              categoryId = existingCategory.id;
            } else {
              // Sử dụng category mặc định nếu không có danh mục
              const defaultCategory = await this.categoryRepository.findOne({
                where: { code: "DEFAULT" },
              });

              if (defaultCategory) {
                categoryId = defaultCategory.id;
              } else {
                // Tạo category mặc định nếu chưa có
                const newCategory = this.categoryRepository.create({
                  name: "Danh mục mặc định",
                  code: "DEFAULT",
                });
                const savedCategory =
                  await this.categoryRepository.save(newCategory);
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
            if (
              assetData.rfidId &&
              assetData.rfidId.trim() &&
              assetData.type === AssetType.FIXED_ASSET
            ) {
              try {
                // // Kiểm tra xem RFID tag đã tồn tại chưa
                // const existingRfid = await this.rfidTagRepository.findOne({
                //   where: { rfidId: assetData.rfidId.trim() }
                // });

                // if (!existingRfid) {
                //   // Tạo RFID tag mới
                //   const rfidTag = this.rfidTagRepository.create({
                //     rfidId: assetData.rfidId.trim(),
                //     assetId: createdAsset.id,
                //     assignedDate: new Date().toISOString(),
                //   });
                //   await this.rfidTagRepository.save(rfidTag);
                // } else {
                //   // RFID tag đã tồn tại, có thể log warning hoặc skip
                //   console.warn(`RFID tag ${assetData.rfidId} already exists for asset ${existingRfid.assetId}`);
                // }
                const rfidTag = this.rfidTagRepository.create({
                  rfidId: assetData.rfidId.trim(),
                  assetId: createdAsset.id,
                  assignedDate: new Date().toISOString(),
                });
                await this.rfidTagRepository.save(rfidTag);
              } catch (rfidError) {
                // Log lỗi RFID nhưng không fail toàn bộ import
                console.error(
                  `Failed to create RFID tag for asset ${createdAsset.id}:`,
                  rfidError.message
                );
              }
            }

            result.successCount++;
            result.createdAssets.push({
              id: createdAsset.id,
              name: createdAsset.name,
              ktCode: createdAsset.ktCode,
              fixedCode: createdAsset.fixedCode,
              type: createdAsset.type,
              category: assetData.category || "Danh mục mặc định",
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
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        "Failed to import Excel file: " + error.message
      );
    }
  }

  private mapAssetType(typeString: string): AssetType {
    const type = typeString.toLowerCase().trim();
    if (type.includes("tài sản cố định") || type.includes("fixed asset")) {
      return AssetType.FIXED_ASSET;
    } else if (
      type.includes("công cụ dụng cụ") ||
      type.includes("tools") ||
      type.includes("equipment")
    ) {
      return AssetType.TOOLS_EQUIPMENT;
    }
    return AssetType.FIXED_ASSET; // Default
  }

  private formatDate(dateString: string): string {
    try {
      // Xử lý các định dạng ngày khác nhau
      if (dateString.includes("/")) {
        // DD/MM/YYYY hoặc MM/DD/YYYY
        const parts = dateString.split("/");
        if (parts.length === 3) {
          // Giả sử định dạng DD/MM/YYYY
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      } else if (dateString.includes("-")) {
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
      return new Date().toISOString().split("T")[0];
    } catch (error) {
      return new Date().toISOString().split("T")[0];
    }
  }

  private generateCategoryCode(categoryName: string): string {
    // Tạo code từ tên category
    // Loại bỏ dấu và chuyển thành chữ hoa
    const code = categoryName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
      .replace(/[^a-zA-Z0-9\s]/g, "") // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, "_") // Thay thế khoảng trắng bằng underscore
      .toUpperCase()
      .substring(0, 20); // Giới hạn độ dài

    return code || "CATEGORY_" + Date.now();
  }

  async classifyRfids(
    rfids: string[],
    currentRoomId: string,
    currentUnitId: string
  ): Promise<ClassifyRfidsResponseDto> {
    if (!rfids || rfids.length === 0) {
      return {
        matched: [],
        neighbors: [],
        otherRooms: [],
        unknowns: [],
      };
    }

    // Tìm tất cả assets có RFID trong danh sách
    const assetsWithRfids = await this.assetRepository
      .createQueryBuilder("asset")
      .leftJoinAndSelect("asset.rfidTag", "rfidTag")
      .leftJoinAndSelect("asset.currentRoom", "currentRoom")
      .leftJoinAndSelect("asset.category", "category")
      .leftJoinAndSelect("currentRoom.unit", "unit")
      .leftJoinAndSelect("currentRoom.adjacentRooms", "adjacentRooms")
      .where("rfidTag.rfidId IN (:...rfids)", { rfids })
      .getMany();

    // Lấy thông tin phòng hiện tại để check adjacent rooms
    const currentRoom = await this.roomRepository.findOne({
      where: { id: currentRoomId },
      relations: ["adjacentRooms"],
    });

    // Lấy danh sách RFID đã tìm thấy
    const foundRfids = assetsWithRfids
      .map((asset) => (asset as FixedAsset)?.rfidTag?.rfidId)
      .filter((rfid) => rfid);

    // RFID không tìm thấy trong hệ thống
    const unknowns = rfids.filter((rfid) => !foundRfids.includes(rfid));

    // Phân loại assets
    const matched: AssetResponseDto[] = [];
    const neighbors: AssetResponseDto[] = [];
    const otherRooms: AssetResponseDto[] = [];

    // Lấy danh sách ID các phòng hàng xóm
    const adjacentRoomIds =
      currentRoom?.adjacentRooms?.map((room) => room.id) || [];

    for (const asset of assetsWithRfids) {
      const assetDto = plainToClass(AssetResponseDto, asset, {
        excludeExtraneousValues: true,
      });

      if (asset.currentRoom?.id === currentRoomId) {
        // Tài sản thuộc phòng hiện tại
        matched.push(assetDto);
      } else if (adjacentRoomIds.includes(asset.currentRoom?.id)) {
        // Tài sản thuộc phòng hàng xóm
        neighbors.push(assetDto);
      } else {
        // Tài sản thuộc phòng khác
        otherRooms.push(assetDto);
      }
    }

    return {
      matched,
      neighbors,
      otherRooms,
      unknowns,
    };
  }

  /**
   * Helper method để trả về kết quả rỗng cho pagination
   */
  private emptyPaginatedResult<T>(currentPage: number, itemsPerPage: number): PaginatedResponseDto<T> {
    return {
      data: [],
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
        firstPage: 1,
        lastPage: 1,
      },
    };
  }

  /**
   * Lấy danh sách tài sản đang chờ tiếp nhận tại kho
   * (Tài sản đã được bàn giao với trạng thái RECEIVED thuộc về đơn vị hiện tại nhưng vẫn ở trong kho)
   */
  async findWarehouseAssets(
    filterDto: WarehouseAssetFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<WarehouseAssetResponseDto>> {
    const {
      search,
      type,
      status,
      unitId,
      warehouseRoomId,
      currentPage = 1,
      itemsPerPage = 10,
    } = filterDto;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.currentRoom', 'currentRoom')
      .leftJoinAndSelect('currentRoom.unit', 'currentUnit')
      .leftJoinAndSelect('asset.rfidTag', 'rfidTag')
      .leftJoinAndSelect('asset.transactionItems', 'transactionItems')
      .leftJoinAndSelect('transactionItems.transaction', 'transaction')
      .leftJoinAndSelect('transaction.fromUnit', 'fromUnit')
      .leftJoinAndSelect('transaction.toUnit', 'toUnit')
      .where('currentRoom.building = :building', { 
        building: 'INVENTORY'
      })
      .andWhere('transaction.status = :transactionStatus', { 
        transactionStatus: TransactionStatus.RECEIVED 
      });

    // **1. SUPER ADMIN: Xem tất cả tài sản warehouse**
    if (this.permissionHelper.isAdmin(currentUser)) {
      // Admin có thể xem tất cả, không cần filter thêm
      console.log('Admin access: viewing all warehouse assets');
    }

    // **2. PHÒNG QUẢN TRỊ (ADMIN_DEPT/CHILD_UNITS): Xem tài sản warehouse của đơn vị con**
    else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
      const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      
      if (accessibleUnitIds.length === 0) {
        return this.emptyPaginatedResult(currentPage, itemsPerPage);
      }

      queryBuilder.andWhere('currentUnit.id IN (:...accessibleUnitIds)', { 
        accessibleUnitIds 
      });
      console.log('Admin Dept access: viewing warehouse assets for units:', accessibleUnitIds);
    }

    // **3. ĐỚN VỊ SỬ DỤNG (USER_DEPT/UNIT): Chỉ xem tài sản warehouse của đơn vị mình**
    else if (this.permissionHelper.isUserDeptUser(currentUser)) {
      if (!currentUser.unitId) {
        return this.emptyPaginatedResult(currentPage, itemsPerPage);
      }

      queryBuilder.andWhere('currentUnit.id = :currentUserUnitId', {
        currentUserUnitId: currentUser.unitId
      });
      console.log('User Dept access: viewing warehouse assets for unit:', currentUser.unitId);
    }

    // **4. Các user khác không có quyền xem**
    else {
      return this.emptyPaginatedResult(currentPage, itemsPerPage);
    }

    // Lọc theo tìm kiếm
    if (search) {
      queryBuilder.andWhere(
        '(asset.name ILIKE :search OR asset.ktCode ILIKE :search OR asset.fixedCode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Lọc theo loại tài sản
    if (type) {
      queryBuilder.andWhere('asset.type = :type', { type });
    }

    // Lọc theo trạng thái tài sản
    if (status) {
      queryBuilder.andWhere('asset.status = :status', { status });
    }

    // Lọc theo đơn vị (với kiểm tra quyền)
    if (unitId) {
      // Admin có thể filter bất kỳ unit nào
      if (this.permissionHelper.isAdmin(currentUser)) {
        queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
      }
      // Admin Dept chỉ có thể filter unit trong phạm vi quyền
      else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
        if (accessibleUnitIds.includes(unitId)) {
          queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
        } else {
          // Nếu filter unit ngoài phạm vi quyền, trả về rỗng
          return this.emptyPaginatedResult(currentPage, itemsPerPage);
        }
      }
      // User Dept chỉ có thể filter unit của mình
      else if (this.permissionHelper.isUserDeptUser(currentUser)) {
        if (unitId === currentUser.unitId) {
          queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
        } else {
          // Nếu filter unit khác, trả về rỗng
          return this.emptyPaginatedResult(currentPage, itemsPerPage);
        }
      }
    }

    // Lọc theo phòng kho cụ thể
    if (warehouseRoomId) {
      queryBuilder.andWhere('currentRoom.id = :warehouseRoomId', { warehouseRoomId });
    }

    // Sắp xếp theo ngày cập nhật mới nhất
    queryBuilder.orderBy('asset.updatedAt', 'DESC');

    // Phân trang
    const offset = (currentPage - 1) * itemsPerPage;
    const [assets, total] = await queryBuilder
      .skip(offset)
      .take(itemsPerPage)
      .getManyAndCount();

    // Chuyển đổi dữ liệu
    const warehouseAssets: WarehouseAssetResponseDto[] = assets.map((asset) => {
      // Tìm giao dịch RECEIVED gần nhất
      const lastReceivedTransaction = asset.transactionItems
        ?.filter(item => item.transaction?.status === TransactionStatus.RECEIVED)
        ?.sort((a, b) => new Date(b.transaction.updatedAt).getTime() - new Date(a.transaction.updatedAt).getTime())
        ?.[0]?.transaction;

      return {
        id: asset.id,
        ktCode: asset.ktCode,
        fixedCode: asset.fixedCode,
        name: asset.name,
        specs: asset.specs,
        entrydate: asset.entrydate,
        unit: asset.unit,
        locationInRoom: asset.locationInRoom,
        quantity: asset.quantity,
        origin: asset.origin,
        purchasePackage: asset.purchasePackage,
        type: asset.type,
        status: asset.status,
        allowMove: asset.allowMove,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        category: asset.category ? {
          id: asset.category.id,
          name: asset.category.name,
          code: asset.category.code,
        } : undefined,
        currentRoom: asset.currentRoom ? {
          id: asset.currentRoom.id,
          name: asset.currentRoom.name,
          roomCode: asset.currentRoom.roomCode,
        } : undefined,
        currentUnit: asset.currentRoom?.unit ? {
          id: asset.currentRoom.unit.id,
          name: asset.currentRoom.unit.name,
          unitCode: asset.currentRoom.unit.unitCode,
        } : undefined,
        rfidTag: (asset as FixedAsset)?.rfidTag ? {
          id: (asset as FixedAsset).rfidTag.id,
          rfid: (asset as FixedAsset).rfidTag.rfidId,
        } : undefined,
        lastReceivedTransaction: lastReceivedTransaction ? {
          transactionId: lastReceivedTransaction.id,
          receivedAt: lastReceivedTransaction.updatedAt,
          fromUnitName: lastReceivedTransaction.fromUnit?.name || 'N/A',
          toUnitName: lastReceivedTransaction.toUnit?.name || 'N/A',
        } : undefined,
      };
    });

    return {
      data: warehouseAssets,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        total,
        totalPages: Math.ceil(total / itemsPerPage),
        hasNext: currentPage < Math.ceil(total / itemsPerPage),
        hasPrev: currentPage > 1,
        nextPage: currentPage < Math.ceil(total / itemsPerPage) ? currentPage + 1 : null,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        firstPage: 1,
        lastPage: Math.ceil(total / itemsPerPage),
      },
    };
  }

  /**
   * Lấy danh sách đơn vị có quyền xem trong warehouse
   */
  async getWarehouseUnits(currentUser: User): Promise<{ id: string; name: string; unitCode: number }[]> {
    // **1. SUPER ADMIN: Xem tất cả units**
    if (this.permissionHelper.isAdmin(currentUser)) {
      const units = await this.unitRepository.find({
        select: ['id', 'name', 'unitCode'],
        order: { name: 'ASC' },
      });
      return units;
    }

    // **2. PHÒNG QUẢN TRỊ (ADMIN_DEPT/CHILD_UNITS): Xem units trong phạm vi quyền**
    else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
      const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      
      if (accessibleUnitIds.length === 0) {
        return [];
      }

      const units = await this.unitRepository.find({
        where: { id: In(accessibleUnitIds) },
        select: ['id', 'name', 'unitCode'],
        order: { name: 'ASC' },
      });
      return units;
    }

    // **3. ĐỚN VỊ SỬ DỤNG (USER_DEPT/UNIT): Chỉ xem unit của mình**
    else if (this.permissionHelper.isUserDeptUser(currentUser)) {
      if (!currentUser.unitId) {
        return [];
      }

      const unit = await this.unitRepository.findOne({
        where: { id: currentUser.unitId },
        select: ['id', 'name', 'unitCode'],
      });

      return unit ? [unit] : [];
    }

    // **4. Các user khác không có quyền xem**
    else {
      return [];
    }
  }

  /**
   * Cập nhật vị trí hàng loạt cho các tài sản warehouse
   */
  async bulkUpdateLocations(
    updateDto: BulkLocationUpdateDto,
    currentUser: User,
  ): Promise<BulkLocationUpdateResultDto> {
    const result: BulkLocationUpdateResultDto = {
      successCount: 0,
      errorCount: 0,
      totalCount: updateDto.items.length,
      successAssetIds: [],
      errors: [],
      executedAt: new Date(),
      executedBy: currentUser.id,
    };

    // Lấy tất cả assetIds để validate
    const assetIds = updateDto.items.map(item => item.assetId);
    const assets = await this.assetRepository.find({
      where: { id: In(assetIds) },
      relations: ['currentRoom', 'currentRoom.unit'],
    });

    // Lấy tất cả roomIds để validate
    const roomIds = updateDto.items.map(item => item.roomId);
    const rooms = await this.roomRepository.find({
      where: { id: In(roomIds) },
      relations: ['unit'],
    });

    const currentYear = new Date().getFullYear();

    for (const updateItem of updateDto.items) {
      try {
        // 1. Validate asset exists
        const asset = assets.find(a => a.id === updateItem.assetId);
        if (!asset) {
          result.errors.push(`Không tìm thấy tài sản với ID: ${updateItem.assetId}`);
          result.errorCount++;
          continue;
        }

        // 2. Validate room exists
        const newRoom = rooms.find(r => r.id === updateItem.roomId);
        if (!newRoom) {
          result.errors.push(`Không tìm thấy phòng với ID: ${updateItem.roomId} cho tài sản ${asset.ktCode}`);
          result.errorCount++;
          continue;
        }

        // 3. Validate asset đang ở warehouse (currentRoom có building = "INVENTORY")
        if (!asset.currentRoom || asset.currentRoom.building !== "INVENTORY") {
          result.errors.push(`Tài sản ${asset.ktCode} không đang ở kho, không thể di chuyển`);
          result.errorCount++;
          continue;
        }

        // 4. Validate room mới phải cùng unit với asset hiện tại
        if (!asset.currentRoom?.unit || newRoom.unit.id !== asset.currentRoom.unit.id) {
          result.errors.push(`Phòng mới phải cùng đơn vị với tài sản ${asset.ktCode}`);
          result.errorCount++;
          continue;
        }

        // 5. Cập nhật currentRoomId của asset
        await this.assetRepository.update(
          { id: asset.id },
          { currentRoomId: newRoom.id }
        );

        // 6. Cập nhật AssetBookItem hiện tại
        const currentAssetBook = await this.findOrCreateAssetBook(asset.currentRoom.unit.id, currentYear);
        await this.assetBookItemRepository
          .createQueryBuilder()
          .update(AssetBookItem)
          .set({ 
            roomId: newRoom.id,
            note: updateItem.note || updateDto.generalNote || `Chuyển từ ${asset.currentRoom.name} đến ${newRoom.name}`,
          })
          .where('bookId = :bookId', { bookId: currentAssetBook.id })
          .andWhere('assetId = :assetId', { assetId: asset.id })
          .andWhere('status = :status', { status: AssetBookItemStatus.IN_USE })
          .execute();

        result.successAssetIds.push(asset.id);
        result.successCount++;

      } catch (error) {
        console.error(`Error updating location for asset ${updateItem.assetId}:`, error);
        result.errors.push(`Lỗi cập nhật tài sản ${updateItem.assetId}: ${error.message}`);
        result.errorCount++;
      }
    }

    return result;
  }

  /**
   * Tìm hoặc tạo AssetBook cho unit và năm
   */
  private async findOrCreateAssetBook(unitId: string, year: number): Promise<AssetBook> {
    let assetBook = await this.assetBookRepository.findOne({
      where: { unitId, year }
    });

    if (!assetBook) {
      assetBook = this.assetBookRepository.create({
        unitId,
        year,
        status: 'OPEN' as any, // AssetBookStatus.OPEN
      });
      assetBook = await this.assetBookRepository.save(assetBook);
    }

    return assetBook;
  }

  /**
   * Lấy danh sách tài sản chưa được định danh
   * - Công cụ dụng cụ: chưa có vị trí (currentRoomId IS NULL)
   * - Tài sản cố định: chưa có vị trí (currentRoomId IS NULL) VÀ chưa có RFID tag
   */
  async findUnidentifiedAssets(
    filterDto: UnidentifiedAssetFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<AssetResponseDto>> {
    const config = {
      searchFields: ["name", "ktCode", "fixedCode"],
      fieldTypeMap: {
        "name": FieldType.TEXT,
        "ktCode": FieldType.TEXT,
        "fixedCode": FieldType.TEXT,
        "type": FieldType.SELECT,
        "createdAt": FieldType.DATE,
      },
      defaultSorting: { field: "createdAt", direction: "DESC" as const },
      relations: [
        "category",
        "currentRoom",
        "rfidTag",
      ],
    };

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.currentRoom', 'currentRoom')
      .leftJoinAndSelect('asset.rfidTag', 'rfidTag')
      .leftJoin('asset.creator', 'creator')
      .where('asset.current_room_id IS NULL');

    // **Áp dụng phân quyền truy cập**
    // **1. SUPER ADMIN: Xem tất cả tài sản chưa định danh**
    if (this.permissionHelper.isAdmin(currentUser)) {
      // Admin có thể xem tất cả, không cần filter thêm
    }

    // **2. PHÒNG QUẢN TRỊ (ADMIN_DEPT/CHILD_UNITS): Chỉ xem tài sản chưa định danh của đơn vị mình**
    else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
      if (!currentUser.unitId) {
        // Trả về kết quả rỗng nếu user không thuộc unit nào
        return {
          data: [],
          pagination: {
            page: filterDto.pagination?.currentPage || 1,
            limit: filterDto.pagination?.itemsPerPage || 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
            nextPage: null,
            prevPage: null,
            firstPage: 1,
            lastPage: 1,
          },
        };
      }

      // ADMIN_DEPT chỉ xem tài sản do người trong đơn vị mình tạo
      // Không xem tài sản của đơn vị con để tránh xung đột giữa các phòng quản trị
      queryBuilder.andWhere(
        '(creator.unitId = :currentUserUnitId OR creator.unitId IS NULL)',
        { currentUserUnitId: currentUser.unitId }
      );
    }

    // **3. ĐỚN VỊ SỬ DỤNG (USER_DEPT/UNIT): Chỉ xem tài sản chưa định danh của đơn vị mình**
    else if (this.permissionHelper.isUserDeptUser(currentUser)) {
      if (!currentUser.unitId) {
        // Trả về kết quả rỗng nếu user không thuộc unit nào
        return {
          data: [],
          pagination: {
            page: filterDto.pagination?.currentPage || 1,
            limit: filterDto.pagination?.itemsPerPage || 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
            nextPage: null,
            prevPage: null,
            firstPage: 1,
            lastPage: 1,
          },
        };
      }

      // Chỉ xem tài sản do người trong đơn vị mình tạo
      queryBuilder.andWhere(
        '(creator.unitId = :currentUserUnitId OR creator.unitId IS NULL)',
        { currentUserUnitId: currentUser.unitId }
      );
    }

    // **4. Các user khác không có quyền xem**
    else {
      // Trả về kết quả rỗng
      return {
        data: [],
        pagination: {
          page: filterDto.pagination?.currentPage || 1,
          limit: filterDto.pagination?.itemsPerPage || 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          nextPage: null,
          prevPage: null,
          firstPage: 1,
          lastPage: 1,
        },
      };
    }

    // Lọc theo loại tài sản (nếu có)
    if (filterDto.type) {
      queryBuilder.andWhere('asset.type = :type', { type: filterDto.type });
      
      // Nếu là tài sản cố định, cần thêm điều kiện chưa có RFID tag
      if (filterDto.type === AssetType.FIXED_ASSET) {
        queryBuilder.andWhere('rfidTag.id IS NULL');
      }
      // Nếu là công cụ dụng cụ, chỉ cần chưa có vị trí (đã filter ở trên)
    } else {
      // Không filter type: lấy cả hai loại
      // - TOOLS_EQUIPMENT: chỉ cần chưa có vị trí
      // - FIXED_ASSET: chưa có vị trí VÀ chưa có RFID tag
      queryBuilder.andWhere(
        '(asset.type = :toolsType OR (asset.type = :fixedType AND rfidTag.asset_id IS NULL))',
        { 
          toolsType: AssetType.TOOLS_EQUIPMENT,
          fixedType: AssetType.FIXED_ASSET
        }
      );
    }

    // Áp dụng filters từ BaseFilterDto (conditions, search, sorting)
    FilterUtil.applyFiltersToQuery(
      queryBuilder,
      filterDto,
      config,
      "asset"
    );

    // Lấy pagination settings với defaults
    const page = filterDto.pagination?.currentPage || 1;
    const limit = filterDto.pagination?.itemsPerPage || 10;
    const skip = (page - 1) * limit;

    // Áp dụng pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query và get count
    const [assets, total] = await queryBuilder.getManyAndCount();

    // Chuyển đổi dữ liệu
    const assetDtos = plainToInstance(AssetResponseDto, assets, {
      excludeExtraneousValues: true,
    });

    // Tính toán pagination metadata
    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
      nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      firstPage: 1,
      lastPage: Math.ceil(total / limit),
    };

    return {
      data: assetDtos,
      pagination,
    };
  }

  /**
   * Đề xuất thanh lý tài sản: cập nhật trạng thái tài sản và sổ tài sản
   */
  async proposeLiquidation(
    id: string,
    note?: string,
  ): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ["currentRoom", "currentRoom.unit"],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    try {
      // 1) Cập nhật trạng thái tài sản
      asset.status = AssetStatus.PROPOSED_LIQUIDATION;
      await this.assetRepository.save(asset);

      // 2) Cập nhật trạng thái trong sổ tài sản (nếu xác định được đơn vị hiện tại)
      const unitId = asset.currentRoom?.unit?.id;
      if (unitId) {
        const currentYear = new Date().getFullYear();
        const currentAssetBook = await this.findOrCreateAssetBook(unitId, currentYear);

        // Cập nhật các bản ghi đang "đang dùng" hoặc "hư hỏng" thành "đề xuất thanh lý"
        await this.assetBookItemRepository
          .createQueryBuilder()
          .update(AssetBookItem)
          .set({
            status: AssetBookItemStatus.PROPOSED_LIQUIDATION,
            note: note || 'Đề xuất thanh lý',
          })
          .where('bookId = :bookId', { bookId: currentAssetBook.id })
          .andWhere('assetId = :assetId', { assetId: asset.id })
          .andWhere('status IN (:...statuses)', { statuses: [AssetBookItemStatus.IN_USE, AssetBookItemStatus.DAMAGED] })
          .execute();
      }

      return this.findOne(id);
    } catch (error) {
      throw new BadRequestException('Failed to propose liquidation: ' + error.message);
    }
  }
}
