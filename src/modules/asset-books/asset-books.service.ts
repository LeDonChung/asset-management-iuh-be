import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, IsNull } from "typeorm";
import { CreateAssetBookDto } from "./dto/create-asset-book.dto";
import { AssetBook } from "src/entities/asset-book.entity";
import { Unit } from "src/entities/unit.entity";
import { Asset, FixedAsset } from "src/entities/asset.entity";
import { Room } from "src/entities/room.entity";
import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import {
  AssetBookResponseDto,
  AssetTypeResponse,
  AssetBookItemResponseDto,
  AssetItemResponseDto,
} from "./dto/asset-book-response.dto";
import { AssetType } from "src/common/shared/AssetType";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { AssetBookFilterDto } from "./dto/asset-book-filter.dto";
import { AssetResponseDto } from "../assets/dto/asset-response.dto";
import { FieldType } from "src/common/dto/filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";

@Injectable()
export class AssetBooksService {
  async findOneByUnitIdAndRoomId(
    unitId: string,
    roomId: string,
    assetType?: AssetType
  ): Promise<AssetBookResponseDto> {
    const assetBook = await this.assetBookRepository.findOne({
      where: {
        unitId,
        status: AssetBookStatus.OPEN,
        lookedAt: IsNull(),
        items: { roomId, asset: { type: assetType } },
      },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.room",
        "items.asset.rfidTag",
      ],
    });

    if (!assetBook) {
      throw new NotFoundException(
        `Asset book with unitId ${unitId} and roomId ${roomId} not found`
      );
    }

    return this.transformToResponseDto(assetBook);
  }

  constructor(
    @InjectRepository(AssetBook)
    private readonly assetBookRepository: Repository<AssetBook>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetBookItem)
    private readonly assetBookItemRepository: Repository<AssetBookItem>,
    private readonly dataSource: DataSource
  ) {}

  async createFromUnitId(unitId: string): Promise<AssetBookResponseDto> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }
    // Tiến hành tạo sổ tài sản cho đơn vị này trong năm hiện tại
    const assetBooks = await this.assetBookRepository.find({
      where: { unitId, year: new Date().getFullYear() },
    });
    if (assetBooks.length > 0) {
      throw new BadRequestException(
        `Asset book for unit ${unit.name} in year ${new Date().getFullYear()} already exists`
      );
    }
    const assetBook = this.assetBookRepository.create({
      unitId,
      year: new Date().getFullYear(),
      status: AssetBookStatus.OPEN,
      lookedAt: null,
    });

    const savedAssetBook = await this.assetBookRepository.save(assetBook);

    // Lấy tất cả các tài sản trong đơn vị này
    const assets = await this.assetRepository.find({
      where: { currentRoom: { unitId: unitId } },
    });
    if (assets.length === 0) {
      throw new BadRequestException(`No assets found for unit ${unit.name}`);
    }
    // Tiến hành tạo sổ tài sản
    const assetBookItems = this.assetBookItemRepository.create(
      assets.map((asset) => ({
        assetId: asset.id,
        roomId: asset.currentRoomId,
        quantity: asset.quantity,
        status: AssetBookItemStatus.IN_USE,
        assignedAt: new Date(),
        note: "",
        bookId: savedAssetBook.id,
      }))
    );

    await this.assetBookItemRepository.save(assetBookItems);
    return this.findOne(savedAssetBook.id);
  }

  async create(
    createAssetBookDto: CreateAssetBookDto
  ): Promise<AssetBookResponseDto> {
    const {
      unitId,
      year,
      items,
      status = AssetBookStatus.OPEN,
    } = createAssetBookDto;

    // Kiểm tra xem đơn vị có tồn tại không
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }

    // Kiểm tra xem đã có sổ tài sản cho đơn vị này trong năm này chưa
    const existingBook = await this.assetBookRepository.findOne({
      where: { unitId, year },
    });

    if (existingBook) {
      throw new BadRequestException(
        `Asset book for unit ${unit.name} in year ${year} already exists`
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Tạo sổ tài sản
      const assetBook = manager.create(AssetBook, {
        unitId,
        year,
        status,
      });

      const savedAssetBook = await manager.save(assetBook);

      // Tạo các mục trong sổ tài sản nếu có
      if (items && items.length > 0) {
        for (const itemDto of items) {
          // Kiểm tra asset có tồn tại không
          const asset = await manager.findOne(Asset, {
            where: { id: itemDto.assetId },
          });
          if (!asset) {
            throw new NotFoundException(
              `Asset with ID ${itemDto.assetId} not found`
            );
          }

          // Kiểm tra room có tồn tại không
          const room = await manager.findOne(Room, {
            where: { id: itemDto.roomId },
          });
          if (!room) {
            throw new NotFoundException(
              `Room with ID ${itemDto.roomId} not found`
            );
          }

          const assetBookItem = manager.create(AssetBookItem, {
            ...itemDto,
            bookId: savedAssetBook.id,
            assignedAt: itemDto.assignedAt || new Date(),
          });

          await manager.save(assetBookItem);
        }
      }

      return this.findOneByUnitIdAndYear(unitId, year);
    });
  }

  async findOne(id: string): Promise<AssetBookResponseDto> {
    const assetBook = await this.assetBookRepository.findOne({
      where: { id },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.room",
        "items.asset.rfidTag",
      ],
    });

    if (!assetBook) {
      throw new NotFoundException(`Asset book with ID ${id} not found`);
    }

    return this.transformToResponseDto(assetBook);
  }

  async findOneByUnitIdAndYear(
    unitId: string,
    year: number
  ): Promise<AssetBookResponseDto> {
    const assetBook = await this.assetBookRepository.findOne({
      where: { unitId, year },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.room",
        "items.asset.rfidTag",
      ],
    });

    if (!assetBook) {
      throw new NotFoundException(
        `Asset book with unitId ${unitId} and year ${year} not found`
      );
    }

    return this.transformToResponseDto(assetBook);
  }

  async findAllByUnitId(unitId: string): Promise<AssetBookResponseDto[]> {
    const assetBooks = await this.assetBookRepository.find({
      where: { unitId },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.room",
        "items.asset.rfidTag",
      ],
    });

    return assetBooks.map((book) => this.transformToResponseDto(book));
  }

  async findOneByUnitIdAndCurrentYear(
    unitId: string
  ): Promise<AssetBookResponseDto> {
    const assetBook = await this.assetBookRepository.findOne({
      where: { unitId, status: AssetBookStatus.OPEN, lookedAt: IsNull() },
      relations: [
        "unit",
        "items",
        "items.asset",
        "items.room",
        "items.asset.rfidTag",
      ],
    });

    if (!assetBook) {
      throw new NotFoundException(
        `Asset book with unitId ${unitId} and current year not found`
      );
    }

    return this.transformToResponseDto(assetBook);
  }

  private transformToResponseDto(assetBook: AssetBook): AssetBookResponseDto {
    const assetTypeMap = new Map<AssetType, AssetBookItemResponseDto[]>();

    if (assetBook.items) {
      for (const item of assetBook.items) {
        const assetType = item.asset.type;

        if (!assetTypeMap.has(assetType)) {
          assetTypeMap.set(assetType, []);
        }

        const itemResponse: AssetBookItemResponseDto = {
          id: item.id,
          roomId: item.roomId,
          assetId: item.assetId,
          assignedAt: item.assignedAt,
          quantity: item.quantity,
          status: item.status,
          note: item.note,
          asset: {
            id: item.asset.id,
            ktCode: item.asset.ktCode,
            fixedCode: item.asset.fixedCode,
            name: item.asset.name,
            specs: item.asset.specs,
            entrydate: item.asset.entrydate,
            unit: item.asset.unit,
            quantity: item.asset.quantity,
            origin: item.asset.origin,
            purchasePackage: item.asset.purchasePackage,
            type: item.asset.type,
            categoryId: item.asset.categoryId,
            status: item.asset.status,
            createdAt: item.asset.createdAt,
            rfidTag:
              item.asset.type === AssetType.FIXED_ASSET
                ? (item.asset as FixedAsset).rfidTag
                : null,
          },
          room: {
            id: item.room.id,
            building: item.room.building,
            roomCode: item.room.roomCode,
            floor: item.room.floor,
            roomNumber: item.room.roomNumber,
            status: item.room.status,
            unitId: item.room.unitId,
            unit: item.room.unit,
            adjacentRooms: item.room.adjacentRooms,
            createdAt: item.room.createdAt,
            createdBy: item.room.createdBy,
          },
        };

        assetTypeMap.get(assetType)!.push(itemResponse);
      }
    }

    // Chuyển đổi Map thành array AssetTypeResponse
    const assetTypes: AssetTypeResponse[] = Array.from(
      assetTypeMap.entries()
    ).map(([type, items]) => ({
      type,
      items,
    }));

    return {
      id: assetBook.id,
      unitId: assetBook.unitId,
      year: assetBook.year,
      lookedAt: assetBook.lookedAt,
      unit: {
        id: assetBook.unit.id,
        name: assetBook.unit.name,
      },
      status: assetBook.status,
      assetTypes,
    };
  }

  async findAssetBooksWithRoleBasedFilter(
    filterDto: AssetBookFilterDto
  ): Promise<PaginatedResponseDto<AssetBookResponseDto>> {
    try {
      const config = {
        searchFields: ["unit.name"],
        fieldTypeMap: {
          "unit.name": FieldType.TEXT,
        },
        defaultSorting: { field: "year", direction: "DESC" as const },
        relations: [
          "unit",
          "items",
          "items.asset",
          "items.room",
          "items.asset.rfidTag",
        ],
      };

      // Build the query manually to avoid duplicate joins
      const queryBuilder =
        this.assetBookRepository.createQueryBuilder("assetBook");

      // Add relations manually to avoid conflicts
      queryBuilder
        .leftJoinAndSelect("assetBook.unit", "unit")
        .leftJoinAndSelect("assetBook.items", "items")
        .leftJoinAndSelect("items.asset", "asset")
        .leftJoinAndSelect("items.room", "room")
        .leftJoinAndSelect("asset.rfidTag", "rfidTag");

      // Apply filters using the FilterUtil
      FilterUtil.applyFiltersToQuery(
        queryBuilder,
        filterDto,
        config,
        "assetBook"
      );

      // Get pagination settings with defaults
      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 5;
      const skip = (page - 1) * limit;

      // Apply pagination
      queryBuilder.skip(skip).take(limit);

      // Execute query and get count
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Transform to response DTOs using our custom transformation
      const data = entities.map((entity) =>
        this.transformToResponseDto(entity)
      );

      // Calculate pagination metadata
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

      return new PaginatedResponseDto(data, pagination);
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async getAssetsFromAssetBooks(
    filterDto: AssetBookFilterDto
  ): Promise<PaginatedResponseDto<AssetItemResponseDto>> {
    try {
      // Build query to get assets from asset book items
      const queryBuilder =
        this.assetBookItemRepository.createQueryBuilder("item");

      // Join with asset book, asset, room, and unit
      queryBuilder
        .leftJoinAndSelect("item.asset", "asset")
        .leftJoinAndSelect("item.room", "room")
        .leftJoinAndSelect("item.book", "book")
        .leftJoinAndSelect("book.unit", "unit")
        .leftJoinAndSelect("room.unit", "roomUnit")
        .leftJoinAndSelect("asset.category", "category")
        .leftJoinAndSelect("asset.rfidTag", "rfidTag");

       // Apply filters
       if (filterDto.unitId) {
         queryBuilder.andWhere("book.unitId = :unitId", {
           unitId: filterDto.unitId,
         });
       }

       if (filterDto.year) {
         queryBuilder.andWhere("book.year = :year", { year: filterDto.year });
       }

       if (filterDto.roomId) {
         queryBuilder.andWhere("item.roomId = :roomId", {
           roomId: filterDto.roomId,
         });
       }

       if (filterDto.assetType) {
         queryBuilder.andWhere("asset.type = :assetType", {
           assetType: filterDto.assetType,
         });
       }

        if (filterDto.campusId) {
          // Filter by campus through unit hierarchy
          queryBuilder.andWhere(
            "(unit.parentUnitId = :campusId OR unit.id = :campusId)",
            { campusId: filterDto.campusId }
          );
        }

        // Apply global search if provided
        if (filterDto.search) {
          queryBuilder.andWhere(
            "(asset.fixedCode ILIKE :search OR asset.ktCode ILIKE :search OR asset.name ILIKE :search OR asset.origin ILIKE :search OR room.roomCode ILIKE :search)",
            { search: `%${filterDto.search}%` }
          );
        }

      // Add default sorting
      if (filterDto.sorting && filterDto.sorting.length > 0) {
        // Sắp xếp theo priority (thấp hơn chạy trước)
        filterDto.sorting
          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
          .forEach((sort) => {
            if (sort.field) {
              // Xác định alias tự động (tên bảng tương ứng với field)
              // Ví dụ: origin, name, type → nằm ở asset
              let alias = "asset";
  
              // Bạn có thể mở rộng nếu cần sắp xếp theo room / unit
              if (["roomCode", "name"].includes(sort.field)) {
                alias = "room";
              } else if (["year"].includes(sort.field)) {
                alias = "book";
              }
  
              queryBuilder.addOrderBy(
                `${alias}.${sort.field}`,
                sort.direction?.toUpperCase() === "ASC" ? "ASC" : "DESC"
              ); 
            }
          });
      } else {
        // Sorting mặc định
        queryBuilder.addOrderBy("asset.createdAt", "DESC");
      }

      // Get pagination settings with defaults
      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 5;
      const skip = (page - 1) * limit;

      // Apply pagination
      queryBuilder.skip(skip).take(limit);

       // Execute query and get count
       const [items, total] = await queryBuilder.getManyAndCount();

      // Transform to AssetResponseDto
      const data: AssetItemResponseDto[] = items.map((item) => ({
        id: item.asset.id,
        ktCode: item.asset.ktCode,
        fixedCode: item.asset.fixedCode,
        name: item.asset.name,
        specs: item.asset.specs,
        entrydate: item.asset.entrydate,
        unit: item.asset.unit,
        quantity: item.asset.quantity,
        origin: item.asset.origin,
        purchasePackage: item.asset.purchasePackage,
        type: item.asset.type,
        categoryId: item.asset.categoryId,
        status: item.asset.status,
        createdAt: item.asset.createdAt,
        note: item.note,
        currentRoom: item.room
          ? {
              id: item.room.id,
              roomCode: item.room.roomCode,
              name: item.room.name,
            }
          : undefined,
      }));

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

      return new PaginatedResponseDto(data, pagination);
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}
