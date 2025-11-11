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

      // Gán phòng hiện tại nếu có
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
    updateAssetDto: UpdateAssetDto
  ): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ["category", "creator", "currentRoom"],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    try {
      // Cập nhật thông tin phòng nếu có
      if (updateAssetDto.currentRoomId !== undefined) {
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

      // Cập nhật thông tin danh mục nếu có
      if (updateAssetDto.categoryId !== undefined) {
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

      const updatedAsset = await this.assetRepository.save({
        ...asset,
        ...updateAssetDto,
        entrydate: updateAssetDto.entrydate
          ? new Date(updateAssetDto.entrydate)
          : asset.entrydate,
      });

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
            // Mapping dữ liệu từ Excel theo cấu trúc bạn cung cấp (13 cột A-M)
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
  private emptyPaginatedResult(currentPage: number, itemsPerPage: number): PaginatedResponseDto<WarehouseAssetResponseDto> {
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
