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
import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import { AssetHistoryResponseDto, TransactionHistoryItemDto, MovementHistoryItemDto, LiquidationHistoryItemDto } from "./dto/asset-history-response.dto";
import { AssetTransactionItem } from "src/entities/asset-transaction-item.entity";
import { AssetTransactionHistory } from "src/entities/asset-transaction-history.entity";
import { AssetMovementItem } from "src/entities/asset-movement-item.entity";
import { AssetMovementHistory } from "src/entities/asset-movement-history.entity";
import { LiquidationProposalItem } from "src/entities/liquidation-proposal-item";
import { LiquidationHistory } from "src/entities/liquidation-history.entity";

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
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(AssetBookItem)
    private readonly assetBookItemRepository: Repository<AssetBookItem>,
    @InjectRepository(AssetBook)
    private readonly assetBookRepository: Repository<AssetBook>,
    @InjectRepository(AssetTransactionItem)
    private readonly assetTransactionItemRepository: Repository<AssetTransactionItem>,
    @InjectRepository(AssetMovementItem)
    private readonly assetMovementItemRepository: Repository<AssetMovementItem>,
    @InjectRepository(LiquidationProposalItem)
    private readonly liquidationProposalItemRepository: Repository<LiquidationProposalItem>,
    private readonly permissionHelper: PermissionHelperService,
  ) {}

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
   * yyyy: số thứ tự tài sản thuộc danh mục đó trong năm (0001, 0002, 0003...)
   * nn: gói mua (bắt đầu từ 00)
   */
  private async generateKtCode(yearPrefix: string, categoryId?: string, purchasePackage = 0): Promise<string> {
    const nn = purchasePackage.toString().padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const xx = currentYear.toString().slice(-2); // Ví dụ: 2025 -> 25
    
    // Tính số thứ tự tài sản thuộc danh mục trong năm hiện tại
    let yyyy = '0001'; // Mặc định bắt đầu từ 0001
    
    if (categoryId) {
      // Đếm số tài sản thuộc danh mục này trong năm hiện tại
      // Sử dụng ktCode pattern để lọc theo năm và danh mục
      const yearPrefix = xx; // 2 chữ số cuối của năm
      
      // Tìm tất cả tài sản có ktCode bắt đầu bằng "xx-" trong năm hiện tại
      const assetsInYear = await this.assetRepository
        .createQueryBuilder('asset')
        .where('asset.categoryId = :categoryId', { categoryId })
        .andWhere('asset.ktCode LIKE :yearPattern', { yearPattern: `${yearPrefix}-%` })
        .getCount();
      
      // Số thứ tự tiếp theo = số tài sản hiện có + 1
      const nextSequence = assetsInYear + 1;
      yyyy = nextSequence.toString().padStart(4, '0');
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
          categoryPrefix = Math.abs(category.code.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0)).toString().padStart(4, '0').substring(0, 4);
        }
      }
    }

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

      if (createAssetDto.type === AssetType.FIXED_ASSET) {
        asset = new FixedAsset();
      } else {
        asset = new ToolsEquipment();
      }

      Object.assign(asset, {
        ...createAssetDto,
        entrydate: new Date(createAssetDto.entrydate),
      });

      if (!createAssetDto.ktCode) {
        asset.ktCode = await this.generateKtCode('', createAssetDto.categoryId, createAssetDto.purchasePackage ?? 0);
      }

      if (!createAssetDto.fixedCode) {
        asset.fixedCode = await this.generateFixedCode(createAssetDto.categoryId);
      }

      let room: Room | null = null;
      if (createAssetDto.currentRoomId != undefined) {
        room = await this.roomRepository.findOne({
          where: { id: createAssetDto.currentRoomId },
          relations: ['unit'],
        });
        if (!room) {
          throw new NotFoundException(
            `Room with ID ${createAssetDto.currentRoomId} not found`
          );
        }
        asset.currentRoom = room;
      }

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

      if (currentUser) {
        asset.creator = currentUser;
      }

      let shouldAddToBook = false;
      
      if (asset.type === AssetType.FIXED_ASSET) {
        if (createAssetDto.rfid && createAssetDto.currentRoomId) {
          shouldAddToBook = true;
        }
      } else if (asset.type === AssetType.TOOLS_EQUIPMENT) {
        if (createAssetDto.currentRoomId) {
          shouldAddToBook = true;
        }
      }

      if (createAssetDto.rfid && asset.type === AssetType.FIXED_ASSET) {
        const existingRfid = await this.rfidTagRepository.findOne({
          where: { rfidId: createAssetDto.rfid },
          relations: ['asset']
        });
        
        if (existingRfid && existingRfid.asset) {
          throw new BadRequestException(`RFID ${createAssetDto.rfid} đã được gán cho tài sản khác`);
        }
        
        let rfidTag: RfidTag;
        if (existingRfid) {
          rfidTag = existingRfid;
        } else {
          rfidTag = new RfidTag();
          rfidTag.rfidId = createAssetDto.rfid;
          rfidTag.assignedDate = new Date().toISOString();
        }
        
        const savedAsset = await this.assetRepository.save(asset);
        
        rfidTag.asset = savedAsset;
        rfidTag.assetId = savedAsset.id;
        await this.rfidTagRepository.save(rfidTag);
        
        savedAsset.status = AssetStatus.IN_USE;
        const finalAsset = await this.assetRepository.save(savedAsset);
        
        if (shouldAddToBook && room && room.unitId) {
          await this.addAssetToBook(finalAsset, room, createAssetDto.quantity || 1);
        }
        
        return plainToInstance(AssetResponseDto, finalAsset, {
          excludeExtraneousValues: true,
        });
      }

      if (asset.type === AssetType.FIXED_ASSET && !createAssetDto.rfid) {
        asset.status = AssetStatus.UNIDENTIFIED;
      }

      const savedAsset = await this.assetRepository.save(asset);
      
      if (shouldAddToBook && room && room.unitId) {
        await this.addAssetToBook(savedAsset, room, createAssetDto.quantity || 1);
      }
      
      return plainToInstance(AssetResponseDto, savedAsset, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new BadRequestException("Failed to create asset: " + error.message);
    }
  }

  private async addAssetToBook(asset: Asset, room: Room, quantity: number): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      
      let assetBook = await this.assetBookRepository.findOne({
        where: {
          unitId: room.unitId,
          year: currentYear,
          status: AssetBookStatus.OPEN,
        },
      });

      if (!assetBook) {
        assetBook = this.assetBookRepository.create({
          unitId: room.unitId,
          year: currentYear,
          status: AssetBookStatus.OPEN,
        });
        assetBook = await this.assetBookRepository.save(assetBook);
      }

      const assetBookItem = this.assetBookItemRepository.create({
        bookId: assetBook.id,
        assetId: asset.id,
        roomId: room.id,
        quantity: quantity,
        assignedAt: new Date(),
        status: AssetBookItemStatus.IN_USE,
        note: '',
      });

      await this.assetBookItemRepository.save(assetBookItem);
    } catch (error) {
      console.error('Error adding asset to book:', error);
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
      const hasCurrentRoom = asset.currentRoom !== null;
      
      if (hasCurrentRoom) {
        const restrictedFields = ['type', 'categoryId', 'ktCode', 'fixedCode'];
        
        for (const field of restrictedFields) {
          if (updateAssetDto[field] !== undefined && updateAssetDto[field] !== asset[field]) {
            throw new BadRequestException(
              `Không thể cập nhật ${field} khi tài sản đã được phân bổ cho phòng sử dụng. Vui lòng thu hồi tài sản trước khi cập nhật.`
            );
          }
        }

        if (updateAssetDto.rfid !== undefined && asset.type === AssetType.FIXED_ASSET) {
          const currentRfid = (asset as FixedAsset).rfidTag?.rfidId;
          
          if (currentRfid && updateAssetDto.rfid !== currentRfid) {
            throw new BadRequestException(
              'Không thể thay đổi mã RFID khi tài sản đã có RFID và được phân bổ cho phòng. Vui lòng thu hồi tài sản trước khi cập nhật.'
            );
          }
        }
      }

      if (updateAssetDto.currentRoomId !== undefined) {
        if (updateAssetDto.currentRoomId === null || updateAssetDto.currentRoomId === '') {
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

      if (!hasCurrentRoom) {
        const additionalFields = ['type', 'ktCode', 'fixedCode'];
        for (const field of additionalFields) {
          if (updateAssetDto[field] !== undefined) {
            updateData[field] = updateAssetDto[field];
          }
        }
      }

      // Xử lý RFID trước khi save asset
      let shouldUpdateStatus = false;
      if (updateAssetDto.rfid !== undefined && asset.type === AssetType.FIXED_ASSET) {
        if (updateAssetDto.rfid) {
          const existingRfid = await this.rfidTagRepository.findOne({
            where: { rfidId: updateAssetDto.rfid },
            relations: ['asset']
          });
          
          if (existingRfid && existingRfid.asset && existingRfid.asset.id !== id) {
            throw new BadRequestException(`RFID ${updateAssetDto.rfid} đã được gán cho tài sản khác`);
          }
          
          const currentRfid = await this.rfidTagRepository.findOne({
            where: { assetId: id }
          });
          if (currentRfid) {
            await this.rfidTagRepository.remove(currentRfid);
          }

          let rfidTag: RfidTag;
          if (existingRfid) {
            rfidTag = existingRfid;
          } else {
            rfidTag = new RfidTag();
            rfidTag.rfidId = updateAssetDto.rfid;
            rfidTag.assignedDate = new Date().toISOString();
          }
          
          rfidTag.assetId = id;
          await this.rfidTagRepository.save(rfidTag);
          (asset as FixedAsset).rfidTag = rfidTag;
          
          shouldUpdateStatus = true;
        } else if (!hasCurrentRoom) {
          const currentRfid = await this.rfidTagRepository.findOne({
            where: { assetId: id }
          });
          if (currentRfid) {
            await this.rfidTagRepository.remove(currentRfid);
          }
          
          if (!asset.currentRoom) {
            updateData.status = AssetStatus.UNIDENTIFIED;
          }
        }
      }

      // Update status if RFID was added
      if (shouldUpdateStatus) {
        updateData.status = AssetStatus.IN_USE;
      }

      const updatedAsset = await this.assetRepository.save({
        ...asset,
        ...updateData,
      });

      const assetWithRelations = await this.assetRepository.findOne({
        where: { id: updatedAsset.id },
        relations: ['rfidTag', 'currentRoom', 'currentRoom.unit'],
      });

      if (assetWithRelations && assetWithRelations.type === AssetType.FIXED_ASSET) {
        const fixedAsset = assetWithRelations as FixedAsset;
        const hasRfid = fixedAsset.rfidTag?.rfidId;
        const hasRoom = fixedAsset.currentRoom;
        
        if (hasRfid && hasRoom && hasRoom.unitId) {
          const existingBookItem = await this.assetBookItemRepository.findOne({
            where: { assetId: fixedAsset.id },
          });
          
          if (!existingBookItem) {
            await this.addAssetToBook(fixedAsset, hasRoom, fixedAsset.quantity || 1);
          }
        }
      }

      return plainToInstance(AssetResponseDto, assetWithRelations || updatedAsset, {
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

    if (asset.type !== AssetType.FIXED_ASSET) {
      throw new BadRequestException("Only Fixed Assets can have RFID tags");
    }

    try {
      const existingRfidTag = await this.rfidTagRepository.findOne({
        where: { assetId: assetId },
      });

      if (existingRfidTag) {
        await this.rfidTagRepository.update(existingRfidTag.rfidId, {
          rfidId: updateRfidDto.rfidId,
          assignedDate: new Date().toISOString(),
        });
      } else {
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
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const dataRows = jsonData.slice(1);
      result.totalProcessed = dataRows.length;

      if (dataRows.length === 0) {
        throw new BadRequestException("File Excel không có dữ liệu tài sản");
      }

      const batchSize = Math.min(10, Math.max(5, dataRows.length));
      const batches = [];

      for (let i = 0; i < dataRows.length; i += batchSize) {
        batches.push(dataRows.slice(i, i + batchSize));
      }

      result.batchSize = batchSize;
      result.totalBatches = batches.length;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = batchIndex * batchSize + i + 2;

          try {
            const assetData: ImportAssetDto = {
              ktCode: await this.validateKtCodeFromExcel(row[0]?.toString().trim()),
              fixedCode: row[1]?.toString().trim() || undefined,
              location: row[2]?.toString() || "",
              name: row[3]?.toString() || "",
              type: this.mapAssetType(row[4]?.toString() || ""),
              category: row[5]?.toString() || "",
              specs: row[6]?.toString() || "",
              origin: row[7]?.toString() || "",
              unit: row[8]?.toString() || "Cái",
              quantity: parseInt(row[9]?.toString()) || 1,
              entrydate: this.formatDate(row[10]?.toString() || ""),
              purchasePackage: parseInt(row[11]?.toString()) || 0,
              rfidId: row[12]?.toString() || "",
              locationInRoom: row[13]?.toString() || "",
              status: AssetStatus.IN_USE,
            };

            if (!assetData.name || !assetData.name.trim()) {
              throw new Error("Tên tài sản là bắt buộc");
            }

            let currentRoomId: string | undefined;
            if (assetData.location) {
              const room = await this.roomRepository.findOne({
                where: { roomCode: assetData.location },
              });
              if (room) {
                currentRoomId = room.id;
              }
            }

            let categoryId: string;

            if (assetData.category && assetData.category.trim()) {
              let existingCategory = await this.categoryRepository.findOne({
                where: { name: assetData.category.trim() },
              });

              if (!existingCategory) {
                const newCategory = this.categoryRepository.create({
                  name: assetData.category.trim(),
                  code: this.generateCategoryCode(assetData.category.trim()),
                });
                existingCategory =
                  await this.categoryRepository.save(newCategory);
              }

              categoryId = existingCategory.id;
            } else {
              const defaultCategory = await this.categoryRepository.findOne({
                where: { code: "DEFAULT" },
              });

              if (defaultCategory) {
                categoryId = defaultCategory.id;
              } else {
                const newCategory = this.categoryRepository.create({
                  name: "Danh mục mặc định",
                  code: "DEFAULT",
                });
                const savedCategory =
                  await this.categoryRepository.save(newCategory);
                categoryId = savedCategory.id;
              }
            }

            const createAssetDto = {
              ...assetData,
              currentRoomId,
              categoryId,
            };

            const createdAsset = await this.create(createAssetDto, currentUser);

            if (
              assetData.rfidId &&
              assetData.rfidId.trim() &&
              assetData.type === AssetType.FIXED_ASSET
            ) {
              try {
                const rfidTag = this.rfidTagRepository.create({
                  rfidId: assetData.rfidId.trim(),
                  assetId: createdAsset.id,
                  assignedDate: new Date().toISOString(),
                });
                await this.rfidTagRepository.save(rfidTag);
              } catch (rfidError) {
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

  /**
   * Import unidentified assets from Excel file
   * Supports roomCode (e.g., 4A01.01) instead of roomId
   */
  async importUnidentifiedAssets(
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
      // Read Excel file
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON (skip header row)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const dataRows = jsonData.slice(1); // Skip header
      
      result.totalProcessed = dataRows.length;

      if (dataRows.length === 0) {
        throw new BadRequestException("File Excel không có dữ liệu tài sản");
      }

      // Process in batches
      const batchSize = Math.min(10, Math.max(5, dataRows.length));
      const batches = [];

      for (let i = 0; i < dataRows.length; i += batchSize) {
        batches.push(dataRows.slice(i, i + batchSize));
      }

      result.batchSize = batchSize;
      result.totalBatches = batches.length;

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = batchIndex * batchSize + i + 2; // +2 for header and 0-index

          try {
            // Map Excel columns to asset data
            // Expected columns: Mã KT | Mã TS | Vị trí | Tên TS | Loại | Danh mục | Thông số KT | Nước SX | ĐVT | Số lượng | Ngày nhập | Gói mua | RFID | Vị trí trong phòng
            const assetData = {
              ktCode: row[0]?.toString().trim() || undefined, // Mã kế toán (để trống)
              fixedCode: row[1]?.toString().trim() || undefined, // Mã tài sản (để trống)
              roomCode: row[2]?.toString().trim() || "", // Mã phòng (VD: 4A01.01)
              name: row[3]?.toString().trim() || "", // Tên tài sản
              type: this.mapAssetType(row[4]?.toString() || "Tài sản cố định"), // Loại tài sản
              category: row[5]?.toString().trim() || "", // Danh mục
              specs: row[6]?.toString().trim() || "", // Thông số KT
              origin: row[7]?.toString().trim() || "", // Nước SX
              unit: row[8]?.toString().trim() || "Cái", // ĐVT
              quantity: this.parseQuantity(row[9]?.toString()), // Số lượng (cột J)
              entrydate: this.formatDate(row[10]?.toString() || ""), // Ngày nhập
              purchasePackage: parseInt(row[11]?.toString()) || 0, // Gói mua
              rfidId: row[12]?.toString().trim() || "", // RFID
              locationInRoom: row[13]?.toString().trim() || "", // Vị trí trong phòng
            };

            // Validate required fields
            if (!assetData.name) {
              throw new Error("Tên tài sản là bắt buộc");
            }

            // Find or create category
            let categoryId: string;
            if (assetData.category) {
              let existingCategory = await this.categoryRepository.findOne({
                where: { name: assetData.category },
              });

              if (!existingCategory) {
                const newCategory = this.categoryRepository.create({
                  name: assetData.category,
                  code: this.generateCategoryCode(assetData.category),
                });
                existingCategory = await this.categoryRepository.save(newCategory);
              }

              categoryId = existingCategory.id;
            } else {
              // Use default category
              let defaultCategory = await this.categoryRepository.findOne({
                where: { code: "DEFAULT" },
              });

              if (!defaultCategory) {
                const newCategory = this.categoryRepository.create({
                  name: "Danh mục mặc định",
                  code: "DEFAULT",
                });
                defaultCategory = await this.categoryRepository.save(newCategory);
              }

              categoryId = defaultCategory.id;
            }

            // Find room by roomCode if provided
            let currentRoomId: string | undefined;
            if (assetData.roomCode) {
              const room = await this.roomRepository.findOne({
                where: { roomCode: assetData.roomCode },
              });
              
              if (!room) {
                throw new Error(`Không tìm thấy phòng với mã: ${assetData.roomCode}`);
              }
              
              currentRoomId = room.id;
            }

            // Create asset DTO
            const createAssetDto: CreateAssetDto = {
              name: assetData.name,
              specs: assetData.specs,
              type: assetData.type,
              categoryId: categoryId,
              unit: assetData.unit,
              quantity: assetData.quantity,
              entrydate: assetData.entrydate,
              origin: assetData.origin,
              purchasePackage: assetData.purchasePackage,
              currentRoomId: currentRoomId,
              locationInRoom: assetData.locationInRoom,
              rfid: assetData.rfidId,
            };

            // Create asset
            const createdAsset = await this.create(createAssetDto, currentUser);

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

        // Small delay between batches to avoid overwhelming the database
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        "Failed to import assets: " + error.message
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
    return AssetType.FIXED_ASSET;
  }

  private parseQuantity(quantityString: string | number | undefined, defaultQuantity: number = 1): number {
    // Nếu đã là number và hợp lệ
    if (typeof quantityString === 'number') {
      return isNaN(quantityString) || quantityString <= 0 ? defaultQuantity : quantityString;
    }
    
    // Nếu là string hoặc undefined
    if (!quantityString || !quantityString.toString().trim()) {
      return defaultQuantity;
    }
    
    // Loại bỏ khoảng trắng và parse
    const trimmed = quantityString.toString().trim();
    
    // Thử parse integer trước
    let parsed = parseInt(trimmed, 10);
    
    // Nếu không parse được integer, thử parse float rồi làm tròn
    if (isNaN(parsed)) {
      const floatParsed = parseFloat(trimmed);
      if (!isNaN(floatParsed) && floatParsed > 0) {
        parsed = Math.floor(floatParsed);
      }
    }
    
    // Nếu parse thành công và là số hợp lệ (> 0)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    
    // Nếu parse không thành công hoặc <= 0, trả về giá trị mặc định
    return defaultQuantity;
  }

  private formatDate(dateString: string): string {
    try {
      if (dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      } else if (dateString.includes("-")) {
        return dateString;
      } else if (dateString.length === 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
      }

      return new Date().toISOString().split("T")[0];
    } catch (error) {
      return new Date().toISOString().split("T")[0];
    }
  }

  private generateCategoryCode(categoryName: string): string {
    const code = categoryName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toUpperCase()
      .substring(0, 20);

    return code || "CATEGORY_" + Date.now();
  }

  /**
   * Generate Excel template for importing assets
   */
  async generateImportTemplate(): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Create headers
    const headers = [
      'Mã kế toán',
      'Mã tài sản', 
      'Vị trí',
      'Tên tài sản',
      'Loại tài sản',
      'Danh mục',
      'Nước SX',
      'ĐVT',
      'Số lượng',
      'Ngày nhập',
      'Gói mua',
      'RFID',
      'Vị trí'
    ];

    // Create sample data
    const sampleData = [
      [
        '', // Mã kế toán (để trống, hệ thống tự sinh)
        '', // Mã tài sản (để trống, hệ thống tự sinh)
        '4A01.01', // Vị trí (Mã phòng)
        '* Máy vi tính Vostro 270MT', // Tên tài sản
        'Tài sản cố định', // Loại tài sản
        'Máy tính', // Danh mục
        'Trung Quốc', // Nước SX
        'Bộ', // ĐVT
        '1', // Số lượng
        '01/01/2024', // Ngày nhập
        '1', // Gói mua
        'E280691500004021E7477C8D', // RFID
        '29', // Vị trí trong phòng
      ],
      [
        '',
        '',
        '4A01.01',
        'Máy tính Dell Optiplex 7070',
        'Tài sản cố định',
        'Máy tính',
        'Trung Quốc',
        'Bộ',
        '1',
        '01/01/2024',
        '1',
        'E280691500004021E7A7AC8D',
        '30',
      ],
      [
        '',
        '',
        '4A01.01',
        'Màn hình Vostro 270MT',
        'Tài sản cố định',
        'Màn hình',
        'Trung Quốc',
        'Bộ',
        '1',
        '01/01/2024',
        '1',
        'E280691500004021E748B88D',
        '29',
      ],
    ];

    // Combine headers with sample data
    const worksheetData = [headers, ...sampleData];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Mã kế toán
      { wch: 15 }, // Mã tài sản
      { wch: 15 }, // Vị trí
      { wch: 35 }, // Tên tài sản
      { wch: 20 }, // Loại tài sản
      { wch: 25 }, // Danh mục
      { wch: 15 }, // Nước SX
      { wch: 10 }, // ĐVT
      { wch: 12 }, // Số lượng
      { wch: 15 }, // Ngày nhập
      { wch: 12 }, // Gói mua
      { wch: 30 }, // RFID
      { wch: 15 }, // Vị trí trong phòng
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách tài sản');

    // Create instructions sheet
    const instructionsData = [
      ['HƯỚNG DẪN IMPORT TÀI SẢN'],
      [''],
      ['Các cột trong file Excel:'],
      ['STT', 'Tên cột', 'Bắt buộc', 'Mô tả', 'Ví dụ'],
      ['1', 'Mã kế toán', 'Không', 'Để trống, hệ thống tự sinh', ''],
      ['2', 'Mã tài sản', 'Không', 'Để trống, hệ thống tự sinh', ''],
      ['3', 'Vị trí', 'Không', 'Mã phòng trong hệ thống', '4A01.01'],
      ['4', 'Tên tài sản', 'CÓ', 'Tên đầy đủ của tài sản', 'Máy vi tính Vostro 270MT'],
      ['5', 'Loại tài sản', 'Không', 'Tài sản cố định hoặc Công cụ dụng cụ', 'Tài sản cố định'],
      ['6', 'Danh mục', 'Không', 'Hệ thống tự tạo nếu chưa có', 'Máy tính'],
      ['7', 'Nước SX', 'Không', 'Nước sản xuất', 'Trung Quốc'],
      ['8', 'ĐVT', 'Không', 'Đơn vị tính', 'Bộ, Cái, Chiếc'],
      ['9', 'Số lượng', 'Không', 'Mặc định 1 cho tài sản cố định', '1'],
      ['10', 'Ngày nhập', 'Không', 'Định dạng dd/mm/yyyy', '01/01/2024'],
      ['11', 'Gói mua', 'Không', 'Số gói thầu', '0'],
      ['12', 'RFID', 'Không', 'Mã RFID (chỉ cho tài sản cố định)', 'E280691500004021E7477C8D'],
      ['13', 'Vị trí', 'Không', 'Vị trí cụ thể trong phòng', '29'],
      [''],
      ['LƯU Ý QUAN TRỌNG:'],
      ['- Cột "Tên tài sản" là BẮT BUỘC phải điền'],
      ['- Mã kế toán và Mã tài sản để trống, hệ thống tự động sinh'],
      ['- Nếu chưa có danh mục, hệ thống sẽ tự động tạo mới'],
      ['- Mã phòng phải tồn tại trong hệ thống (ví dụ: 4A01.01)'],
      ['- Loại tài sản: "Tài sản cố định" hoặc "Công cụ dụng cụ"'],
      ['- RFID chỉ áp dụng cho Tài sản cố định, có thể để trống'],
      ['- Ngày nhập theo định dạng dd/mm/yyyy (ví dụ: 14/12/2025)'],
      [''],
      ['XỬ LÝ LỖI:'],
      ['- Nếu có lỗi, hệ thống sẽ hiển thị số dòng và thông báo lỗi cụ thể'],
      ['- Các dòng thành công vẫn được import, chỉ bỏ qua dòng lỗi'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 15 },
      { wch: 50 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Hướng dẫn');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  private async validateKtCodeFromExcel(inputKtCode: string | undefined): Promise<string | undefined> {
    if (!inputKtCode || !inputKtCode.trim()) {
      return undefined;
    }

    const ktCode = inputKtCode.trim();
    
    const existingAsset = await this.assetRepository.findOne({
      where: { ktCode }
    });

    if (!existingAsset) {
      return ktCode;
    }

    return undefined;
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

    const assetsWithRfids = await this.assetRepository
      .createQueryBuilder("asset")
      .leftJoinAndSelect("asset.rfidTag", "rfidTag")
      .leftJoinAndSelect("asset.currentRoom", "currentRoom")
      .leftJoinAndSelect("asset.category", "category")
      .leftJoinAndSelect("currentRoom.unit", "unit")
      .leftJoinAndSelect("currentRoom.adjacentRooms", "adjacentRooms")
      .where("rfidTag.rfidId IN (:...rfids)", { rfids })
      .getMany();

    const currentRoom = await this.roomRepository.findOne({
      where: { id: currentRoomId },
      relations: ["adjacentRooms"],
    });

    const foundRfids = assetsWithRfids
      .map((asset) => (asset as FixedAsset)?.rfidTag?.rfidId)
      .filter((rfid) => rfid);

    const unknowns = rfids.filter((rfid) => !foundRfids.includes(rfid));

    const matched: AssetResponseDto[] = [];
    const neighbors: AssetResponseDto[] = [];
    const otherRooms: AssetResponseDto[] = [];

    const adjacentRoomIds =
      currentRoom?.adjacentRooms?.map((room) => room.id) || [];

    for (const asset of assetsWithRfids) {
      const assetDto = plainToClass(AssetResponseDto, asset, {
        excludeExtraneousValues: true,
      });

      if (asset.currentRoom?.id === currentRoomId) {
        matched.push(assetDto);
      } else if (adjacentRoomIds.includes(asset.currentRoom?.id)) {
        neighbors.push(assetDto);
      } else {
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

    if (this.permissionHelper.isAdmin(currentUser)) {
    }

    else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
      const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      
      if (accessibleUnitIds.length === 0) {
        return this.emptyPaginatedResult(currentPage, itemsPerPage);
      }

      queryBuilder.andWhere('currentUnit.id IN (:...accessibleUnitIds)', { 
        accessibleUnitIds 
      });
    }

    else if (this.permissionHelper.isUserDeptUser(currentUser)) {
      if (!currentUser.unitId) {
        return this.emptyPaginatedResult(currentPage, itemsPerPage);
      }

      queryBuilder.andWhere('currentUnit.id = :currentUserUnitId', {
        currentUserUnitId: currentUser.unitId
      });
    }

    else {
      return this.emptyPaginatedResult(currentPage, itemsPerPage);
    }

    if (search) {
      queryBuilder.andWhere(
        '(asset.name ILIKE :search OR asset.ktCode ILIKE :search OR asset.fixedCode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (type) {
      queryBuilder.andWhere('asset.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('asset.status = :status', { status });
    }

    if (unitId) {
      if (this.permissionHelper.isAdmin(currentUser)) {
        queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
      }
      else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        const accessibleUnitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
        if (accessibleUnitIds.includes(unitId)) {
          queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
        } else {
          return this.emptyPaginatedResult(currentPage, itemsPerPage);
        }
      }
      else if (this.permissionHelper.isUserDeptUser(currentUser)) {
        if (unitId === currentUser.unitId) {
          queryBuilder.andWhere('transaction.toUnitId = :unitId', { unitId });
        } else {
          return this.emptyPaginatedResult(currentPage, itemsPerPage);
        }
      }
    }

    if (warehouseRoomId) {
      queryBuilder.andWhere('currentRoom.id = :warehouseRoomId', { warehouseRoomId });
    }

    queryBuilder.orderBy('asset.updatedAt', 'DESC');

    const offset = (currentPage - 1) * itemsPerPage;
    const [assets, total] = await queryBuilder
      .skip(offset)
      .take(itemsPerPage)
      .getManyAndCount();

    const warehouseAssets: WarehouseAssetResponseDto[] = assets.map((asset) => {
      const lastReceivedTransactionItem = asset.transactionItems
        ?.filter(item => 
          item.assetId === asset.id && 
          item.transaction?.status === TransactionStatus.RECEIVED
        )
        ?.sort((a, b) => new Date(b.transaction.updatedAt).getTime() - new Date(a.transaction.updatedAt).getTime())
        ?.[0];

      const lastReceivedTransaction = lastReceivedTransactionItem?.transaction;

      const quantity = lastReceivedTransactionItem?.quantity ?? asset.quantity ?? 1;

      return {
        id: asset.id,
        ktCode: asset.ktCode,
        fixedCode: asset.fixedCode,
        name: asset.name,
        specs: asset.specs,
        entrydate: asset.entrydate,
        unit: asset.unit,
        locationInRoom: asset.locationInRoom,
        quantity: quantity,
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

  async getWarehouseUnits(currentUser: User): Promise<{ id: string; name: string; unitCode: number }[]> {
    if (this.permissionHelper.isAdmin(currentUser)) {
      const units = await this.unitRepository.find({
        select: ['id', 'name', 'unitCode'],
        order: { name: 'ASC' },
      });
      return units;
    }

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

    else {
      return [];
    }
  }

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

    const assetIds = updateDto.items.map(item => item.assetId);
    const assets = await this.assetRepository.find({
      where: { id: In(assetIds) },
      relations: ['currentRoom', 'currentRoom.unit'],
    });

    const roomIds = updateDto.items.map(item => item.roomId);
    const rooms = await this.roomRepository.find({
      where: { id: In(roomIds) },
      relations: ['unit'],
    });

    const currentYear = new Date().getFullYear();

    for (const updateItem of updateDto.items) {
      try {
        const asset = assets.find(a => a.id === updateItem.assetId);
        if (!asset) {
          result.errors.push(`Không tìm thấy tài sản với ID: ${updateItem.assetId}`);
          result.errorCount++;
          continue;
        }

        const newRoom = rooms.find(r => r.id === updateItem.roomId);
        if (!newRoom) {
          result.errors.push(`Không tìm thấy phòng với ID: ${updateItem.roomId} cho tài sản ${asset.ktCode}`);
          result.errorCount++;
          continue;
        }

        if (!asset.currentRoom || asset.currentRoom.building !== "INVENTORY") {
          result.errors.push(`Tài sản ${asset.ktCode} không đang ở kho, không thể di chuyển`);
          result.errorCount++;
          continue;
        }

        if (!asset.currentRoom?.unit || newRoom.unit.id !== asset.currentRoom.unit.id) {
          result.errors.push(`Phòng mới phải cùng đơn vị với tài sản ${asset.ktCode}`);
          result.errorCount++;
          continue;
        }

        // Tài sản đã có trong AssetBook của đơn vị (từ khi tiếp nhận transaction)
        // Chỉ cần cập nhật vị trí: cùng phòng thì cộng dồn, khác phòng thì tạo mới
        const currentAssetBook = await this.findOrCreateAssetBook(asset.currentRoom.unit.id, currentYear);
        const warehouseRoomId = asset.currentRoom.id;
        
        // Tìm AssetBookItem ở phòng kho hiện tại
        const sourceAssetBookItem = await this.assetBookItemRepository.findOne({
          where: {
            bookId: currentAssetBook.id,
            assetId: asset.id,
            roomId: warehouseRoomId, // Quan trọng: chỉ tìm ở phòng kho hiện tại
            status: AssetBookItemStatus.IN_USE,
          },
        });

        if (!sourceAssetBookItem) {
          result.errors.push(`Không tìm thấy bản ghi sổ tài sản ở kho cho tài sản ${asset.ktCode}`);
          result.errorCount++;
          continue;
        }

        const transferQuantity = sourceAssetBookItem.quantity;

        const existingTargetItem = await this.assetBookItemRepository.findOne({
          where: {
            bookId: currentAssetBook.id,
            assetId: asset.id,
            roomId: newRoom.id, // Quan trọng: phải cùng roomId mới cộng dồn
            status: AssetBookItemStatus.IN_USE,
          },
        });

        if (existingTargetItem) {
          existingTargetItem.quantity += transferQuantity;
          existingTargetItem.note = `${existingTargetItem.note || ''}\nNhận thêm ${transferQuantity} từ ${asset.currentRoom.name} theo cập nhật vị trí hàng loạt`.trim();
          await this.assetBookItemRepository.save(existingTargetItem);
        } else {
          const newAssetBookItem = this.assetBookItemRepository.create({
            bookId: currentAssetBook.id,
            assetId: asset.id,
            roomId: newRoom.id,
            assignedAt: new Date(),
            quantity: transferQuantity,
            status: AssetBookItemStatus.IN_USE,
            note: updateItem.note || updateDto.generalNote || `Chuyển ${transferQuantity} từ ${asset.currentRoom.name} đến ${newRoom.name} theo cập nhật vị trí hàng loạt`,
          });
          await this.assetBookItemRepository.save(newAssetBookItem);
        }

        if (sourceAssetBookItem.quantity <= transferQuantity) {
          sourceAssetBookItem.status = AssetBookItemStatus.TRANSFERRED;
          sourceAssetBookItem.note = `${sourceAssetBookItem.note || ''}\nChuyển ${transferQuantity} đến ${newRoom.name} theo cập nhật vị trí hàng loạt`.trim();
          await this.assetBookItemRepository.save(sourceAssetBookItem);
        } else {
          sourceAssetBookItem.quantity -= transferQuantity;
          sourceAssetBookItem.note = `${sourceAssetBookItem.note || ''}\nChuyển ${transferQuantity} đến ${newRoom.name} theo cập nhật vị trí hàng loạt`.trim();
          await this.assetBookItemRepository.save(sourceAssetBookItem);
        }

        // Cập nhật currentRoomId của asset
        await this.assetRepository.update(
          { id: asset.id },
          { currentRoomId: newRoom.id }
        );

        result.successAssetIds.push(asset.id);
        result.successCount++;

      } catch (error) {
        result.errors.push(`Lỗi cập nhật tài sản ${updateItem.assetId}: ${error.message}`);
        result.errorCount++;
      }
    }

    return result;
  }

  private async findOrCreateAssetBook(unitId: string, year: number): Promise<AssetBook> {
    let assetBook = await this.assetBookRepository.findOne({
      where: { unitId, year }
    });

    if (!assetBook) {
      assetBook = this.assetBookRepository.create({
        unitId,
        year,
        status: 'OPEN' as any,
      });
      assetBook = await this.assetBookRepository.save(assetBook);
    }

    return assetBook;
  }

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
      .leftJoin('asset.creator', 'creator');

    if (this.permissionHelper.isAdmin(currentUser)) {
    }

    else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
      if (!currentUser.unitId) {
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

      queryBuilder.andWhere(
        '(creator.unitId = :currentUserUnitId OR creator.unitId IS NULL)',
        { currentUserUnitId: currentUser.unitId }
      );
    }

    else if (this.permissionHelper.isUserDeptUser(currentUser)) {
      if (!currentUser.unitId) {
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

      queryBuilder.andWhere(
        '(creator.unitId = :currentUserUnitId OR creator.unitId IS NULL)',
        { currentUserUnitId: currentUser.unitId }
      );
    }

    else {
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

    // Lọc theo loại tài sản nếu có
    if (filterDto.type) {
      queryBuilder.andWhere('asset.type = :type', { type: filterDto.type });
      
      // Nếu là tài sản cố định, chỉ lấy những tài sản chưa có RFID
      if (filterDto.type === AssetType.FIXED_ASSET) {
        queryBuilder.andWhere('rfidTag.rfidId IS NULL');
      }
    } else {
      // Mặc định: lấy tất cả CCDC chưa có phòng HOẶC TSCD chưa có RFID
      queryBuilder.andWhere(
        '((asset.type = :toolsType AND asset.current_room_id IS NULL) OR (asset.type = :fixedType AND rfidTag.rfidId IS NULL))',
        { 
          toolsType: AssetType.TOOLS_EQUIPMENT,
          fixedType: AssetType.FIXED_ASSET
        }
      );
    }

    FilterUtil.applyFiltersToQuery(
      queryBuilder,
      filterDto,
      config,
      "asset"
    );

    const page = filterDto.pagination?.currentPage || 1;
    const limit = filterDto.pagination?.itemsPerPage || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [assets, total] = await queryBuilder.getManyAndCount();

    const assetDtos = plainToInstance(AssetResponseDto, assets, {
      excludeExtraneousValues: true,
    });

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
      asset.status = AssetStatus.PROPOSED_LIQUIDATION;
      await this.assetRepository.save(asset);

      const unitId = asset.currentRoom?.unit?.id;
      if (unitId) {
        const currentYear = new Date().getFullYear();
        const currentAssetBook = await this.findOrCreateAssetBook(unitId, currentYear);

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

  async getAssetHistory(assetId: string): Promise<AssetHistoryResponseDto> {
    // Verify asset exists
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    // Fetch transaction histories
    const transactionItems = await this.assetTransactionItemRepository.find({
      where: { assetId },
      relations: [
        'transaction',
        'transaction.histories',
        'transaction.histories.changer',
        'fromRoom',
        'toRoom',
        'transaction.fromUnit',
        'transaction.toUnit',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    // Fetch movement histories
    const movementItems = await this.assetMovementItemRepository.find({
      where: { assetId },
      relations: [
        'movement',
        'movement.histories',
        'movement.histories.changer',
        'fromRoom',
        'fromRoom.unit',
        'toRoom',
        'toRoom.unit',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    // Fetch liquidation histories
    const liquidationItems = await this.liquidationProposalItemRepository.find({
      where: { assetId },
      relations: [
        'proposal',
        'proposal.histories',
        'proposal.histories.handler',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    // Transform transaction histories
    const transactionHistories: TransactionHistoryItemDto[] = [];
    for (const item of transactionItems) {
      if (item.transaction?.histories) {
        for (const history of item.transaction.histories) {
          transactionHistories.push({
            id: history.id,
            type: 'TRANSACTION',
            transactionId: item.transaction.id,
            oldStatus: history.oldStatus,
            newStatus: history.newStatus,
            user: {
              id: history.changer.id,
              fullName: history.changer.fullName,
              username: history.changer.username,
            },
            note: history.note,
            evidenceUrl: history.evidenceUrl,
            createdAt: history.createdAt,
            fromRoom: item.fromRoom ? {
              id: item.fromRoom.id,
              name: item.fromRoom.name,
              roomCode: item.fromRoom.roomCode,
            } : undefined,
            toRoom: item.toRoom ? {
              id: item.toRoom.id,
              name: item.toRoom.name,
              roomCode: item.toRoom.roomCode,
            } : undefined,
            fromUnit: item.transaction.fromUnit ? {
              id: item.transaction.fromUnit.id,
              name: item.transaction.fromUnit.name,
              unitCode: item.transaction.fromUnit.unitCode,
            } : undefined,
            toUnit: item.transaction.toUnit ? {
              id: item.transaction.toUnit.id,
              name: item.transaction.toUnit.name,
              unitCode: item.transaction.toUnit.unitCode,
            } : undefined,
          });
        }
      }
    }

    // Transform movement histories
    const movementHistories: MovementHistoryItemDto[] = [];
    for (const item of movementItems) {
      if (item.movement?.histories) {
        for (const history of item.movement.histories) {
          movementHistories.push({
            id: history.id,
            type: 'MOVEMENT',
            movementId: item.movement.id,
            oldStatus: history.oldStatus,
            newStatus: history.newStatus,
            user: {
              id: history.changer.id,
              fullName: history.changer.fullName,
              username: history.changer.username,
            },
            note: history.note,
            evidenceUrl: history.evidenceUrl,
            createdAt: history.createdAt,
            fromRoom: item.fromRoom ? {
              id: item.fromRoom.id,
              name: item.fromRoom.name,
              roomCode: item.fromRoom.roomCode,
            } : undefined,
            toRoom: item.toRoom ? {
              id: item.toRoom.id,
              name: item.toRoom.name,
              roomCode: item.toRoom.roomCode,
            } : undefined,
            fromUnit: item.fromRoom?.unit ? {
              id: item.fromRoom.unit.id,
              name: item.fromRoom.unit.name,
              unitCode: item.fromRoom.unit.unitCode,
            } : undefined,
            toUnit: item.toRoom?.unit ? {
              id: item.toRoom.unit.id,
              name: item.toRoom.unit.name,
              unitCode: item.toRoom.unit.unitCode,
            } : undefined,
          });
        }
      }
    }

    // Transform liquidation histories
    const liquidationHistories: LiquidationHistoryItemDto[] = [];
    for (const item of liquidationItems) {
      if (item.proposal?.histories) {
        for (const history of item.proposal.histories) {
          liquidationHistories.push({
            id: history.id,
            type: 'LIQUIDATION',
            proposalId: item.proposal.id,
            actionStatus: history.actionStatus,
            user: {
              id: history.handler.id,
              fullName: history.handler.fullName,
              username: history.handler.username,
            },
            note: history.note,
            evidenceUrl: history.evidenceUrl,
            createdAt: history.createdAt,
          });
        }
      }
    }

    // Combine and sort all histories by date
    const allHistories = [
      ...transactionHistories,
      ...movementHistories,
      ...liquidationHistories,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      assetId,
      transactions: transactionHistories,
      movements: movementHistories,
      liquidations: liquidationHistories,
      all: allHistories,
    };
  }
}
