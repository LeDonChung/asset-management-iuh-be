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
import { FieldType, FilterOperator } from "src/common/dto/filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";
import { InventoryResult } from "src/entities/inventory-result";
import { InventoryResultStatus } from "src/common/shared/InventoryResultStatus";
import { LiquidationProposedFilterDto } from "./dto/liquidation-proposed-filter.dto";
import { LiquidationProposedInventoryResultDto } from "./dto/liquidation-proposed-inventory-result.dto";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import { User } from "src/entities/user.entity";
import { plainToInstance } from "class-transformer";
import { InventorySession } from "src/entities/inventory-session.entity";
import { AssetStatus } from "src/common/shared/AssetStatus";
import * as ExcelJS from "exceljs";
import * as fs from "fs";
import { InventoryGroupAssignment } from "src/entities/inventory-group-assignment";
import { CreateAssetBookFromInventoryDto } from "./dto/create-asset-book-from-inventory.dto";

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
        items: {
          roomId,
          asset: { type: assetType },
          status: AssetBookItemStatus.IN_USE,
        },
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
    @InjectRepository(InventoryResult)
    private readonly inventoryResultRepository: Repository<InventoryResult>,
    @InjectRepository(InventorySession)
    private readonly inventorySessionRepository: Repository<InventorySession>,
    @InjectRepository(InventoryGroupAssignment)
    private readonly inventoryGroupAssignmentRepository: Repository<InventoryGroupAssignment>,
    private readonly dataSource: DataSource,
    private readonly permissionHelper: PermissionHelperService
  ) {}

  async createFromUnitId(unitId: string): Promise<AssetBookResponseDto> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }
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

    const assets = await this.assetRepository.find({
      where: { currentRoom: { unitId: unitId } },
    });
    if (assets.length === 0) {
      throw new BadRequestException(`No assets found for unit ${unit.name}`);
    }

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

    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }

    const existingBook = await this.assetBookRepository.findOne({
      where: { unitId, year },
    });

    if (existingBook) {
      throw new BadRequestException(
        `Asset book for unit ${unit.name} in year ${year} already exists`
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const assetBook = manager.create(AssetBook, {
        unitId,
        year,
        status,
      });

      const savedAssetBook = await manager.save(assetBook);

      if (items && items.length > 0) {
        for (const itemDto of items) {
          const asset = await manager.findOne(Asset, {
            where: { id: itemDto.assetId },
          });
          if (!asset) {
            throw new NotFoundException(
              `Asset with ID ${itemDto.assetId} not found`
            );
          }

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
            locationInRoom: item.asset.locationInRoom,
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

      const queryBuilder =
        this.assetBookRepository.createQueryBuilder("assetBook");

      queryBuilder
        .leftJoinAndSelect("assetBook.unit", "unit")
        .leftJoinAndSelect("assetBook.items", "items")
        .leftJoinAndSelect("items.asset", "asset")
        .leftJoinAndSelect("items.room", "room")
        .leftJoinAndSelect("asset.rfidTag", "rfidTag");

      FilterUtil.applyFiltersToQuery(
        queryBuilder,
        filterDto,
        config,
        "assetBook"
      );

      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 5;
      const skip = (page - 1) * limit;

      queryBuilder.skip(skip).take(limit);

      const [entities, total] = await queryBuilder.getManyAndCount();

      const data = entities.map((entity) =>
        this.transformToResponseDto(entity)
      );

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
      throw e;
    }
  }

  async getAssetsFromAssetBooks(
    filterDto: AssetBookFilterDto
  ): Promise<PaginatedResponseDto<AssetItemResponseDto>> {
    try {
      const queryBuilder =
        this.assetBookItemRepository.createQueryBuilder("item");

      queryBuilder
        .leftJoinAndSelect("item.asset", "asset")
        .leftJoinAndSelect("item.room", "room")
        .leftJoinAndSelect("item.book", "book")
        .leftJoinAndSelect("book.unit", "unit")
        .leftJoinAndSelect("asset.category", "category")
        .leftJoinAndSelect("asset.rfidTag", "rfidTag");

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

      if (filterDto.status) {
        queryBuilder.andWhere("item.status = :status", {
          status: filterDto.status,
        });
      }

      if (filterDto.campusId) {
        queryBuilder.andWhere(
          "(unit.parentUnitId = :campusId OR unit.id = :campusId)",
          { campusId: filterDto.campusId }
        );
      }

      if (filterDto.search) {
        queryBuilder.andWhere(
          "(asset.fixedCode ILIKE :search OR asset.ktCode ILIKE :search OR asset.name ILIKE :search OR asset.origin ILIKE :search OR room.roomCode ILIKE :search)",
          { search: `%${filterDto.search}%` }
        );
      }

      queryBuilder.distinct(true);

      if (filterDto.sorting && filterDto.sorting.length > 0) {
        filterDto.sorting
          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
          .forEach((sort) => {
            if (sort.field) {
              let alias = "asset";

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
        queryBuilder.addOrderBy("asset.status", "ASC");
      }

      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 5;
      const skip = (page - 1) * limit;

      queryBuilder.skip(skip).take(limit);

      const [items, total] = await queryBuilder.getManyAndCount();

      const data: AssetItemResponseDto[] = items.map((item) => ({
        id: item.asset.id,
        ktCode: item.asset.ktCode,
        fixedCode: item.asset.fixedCode,
        name: item.asset.name,
        specs: item.asset.specs,
        entrydate: item.asset.entrydate,
        unit: item.asset.unit,
        locationInRoom: item.asset.locationInRoom,
        quantity: item.asset.quantity,
        origin: item.asset.origin,
        purchasePackage: item.asset.purchasePackage,
        type: item.asset.type,
        categoryId: item.asset.categoryId,
        status: item.asset.status,
        bookItemStatus: item.status,
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
      throw e;
    }
  }

  async findLiquidationProposedAssets(
    filterDto: LiquidationProposedFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<LiquidationProposedInventoryResultDto>> {
    try {
      const latestInventorySession = await this.inventorySessionRepository
        .createQueryBuilder("session")
        .orderBy("session.year", "DESC")
        .addOrderBy("session.createdAt", "DESC")
        .getOne();

      if (!latestInventorySession) {
        return new PaginatedResponseDto([], {
          page: 1,
          limit: filterDto.pagination?.itemsPerPage || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }

      const unitAccessFilter =
        await this.permissionHelper.createUnitAccessFilter(currentUser);

      if (
        unitAccessFilter.value.includes("00000000-0000-0000-0000-000000000000")
      ) {
        return new PaginatedResponseDto([], {
          page: 1,
          limit: filterDto.pagination?.itemsPerPage || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }

      let queryBuilder = this.inventoryResultRepository
        .createQueryBuilder("inventoryResult")
        .leftJoinAndSelect("inventoryResult.asset", "asset")
        .leftJoinAndSelect("asset.category", "category")
        .leftJoinAndSelect("asset.currentRoom", "currentRoom")
        .leftJoinAndSelect("currentRoom.unit", "unit")
        .leftJoinAndSelect("inventoryResult.room", "room")
        .leftJoinAndSelect("inventoryResult.fileUrls", "fileUrls")
        .leftJoinAndSelect("inventoryResult.assignment", "assignment")
        .leftJoinAndSelect("assignment.group", "group")
        .leftJoinAndSelect("group.subInventory", "subInventory")
        .leftJoinAndSelect(
          "subInventory.inventorySessionUnit",
          "inventorySessionUnit"
        )
        .leftJoinAndSelect(
          "inventorySessionUnit.inventorySession",
          "inventorySession"
        )
        .where("inventoryResult.status = :status", {
          status: InventoryResultStatus.LIQUIDATION_PROPOSED,
        })
        .andWhere("inventorySession.id = :sessionId", {
          sessionId: latestInventorySession.id,
        });

      if (unitAccessFilter.operator === "in") {
        queryBuilder = queryBuilder.andWhere(
          "currentRoom.unitId IN (:...unitIds)",
          { unitIds: unitAccessFilter.value }
        );
      } else {
        queryBuilder = queryBuilder.andWhere("currentRoom.unitId = :unitId", {
          unitId: unitAccessFilter.value[0],
        });
      }

      if (filterDto.roomId) {
        const accessibleUnitIds =
          await this.permissionHelper.getAccessibleUnitIds(currentUser);

        const room = await this.dataSource.manager.findOne(Room, {
          where: { id: filterDto.roomId },
          relations: ["unit"],
        });

        if (room && accessibleUnitIds.includes(room.unitId)) {
          queryBuilder = queryBuilder.andWhere(
            "inventoryResult.roomId = :roomId",
            { roomId: filterDto.roomId }
          );
        } else {
          return new PaginatedResponseDto([], {
            page: 1,
            limit: filterDto.pagination?.itemsPerPage || 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          });
        }
      }

      if (filterDto.assetType) {
        queryBuilder = queryBuilder.andWhere("asset.type = :assetType", {
          assetType: filterDto.assetType,
        });
      }

      if (filterDto.search) {
        queryBuilder = queryBuilder.andWhere(
          "(asset.name ILIKE :search OR asset.assetCode ILIKE :search OR asset.serialNumber ILIKE :search OR room.name ILIKE :search OR room.code ILIKE :search)",
          { search: `%${filterDto.search}%` }
        );
      }

      if (filterDto.sorting && filterDto.sorting.length > 0) {
        const sortedConfigs = [...filterDto.sorting].sort(
          (a, b) => (a.priority || 0) - (b.priority || 0)
        );

        sortedConfigs.forEach((sortConfig, index) => {
          if (!sortConfig.field) return;

          let fieldPath = sortConfig.field;
          switch (sortConfig.field) {
            case "asset.name":
              fieldPath = "asset.name";
              break;
            case "asset.fixedCode":
              fieldPath = "asset.fixedCode";
              break;
            case "asset.ktCode":
              fieldPath = "asset.ktCode";
              break;
            case "room.code":
              fieldPath = "room.roomCode";
              break;
            case "systemQuantity":
              fieldPath = "inventoryResult.systemQuantity";
              break;
            case "countedQuantity":
              fieldPath = "inventoryResult.countedQuantity";
              break;
            default:
              fieldPath = `inventoryResult.${sortConfig.field}`;
              break;
          }

          const direction =
            (sortConfig.direction?.toUpperCase() as "ASC" | "DESC") || "ASC";

          if (index === 0) {
            queryBuilder = queryBuilder.orderBy(fieldPath, direction);
          } else {
            queryBuilder = queryBuilder.addOrderBy(fieldPath, direction);
          }
        });
      } else {
        queryBuilder = queryBuilder.orderBy(
          "inventoryResult.createdAt",
          "DESC"
        );
      }

      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 20;
      const skip = (page - 1) * limit;

      queryBuilder = queryBuilder.skip(skip).take(limit);

      const [results, total] = await queryBuilder.getManyAndCount();

      const transformedResults = results.map((result) => ({
        ...result,
        room: result.room
          ? {
              id: result.room.id,
              name: result.room.name,
              code: result.room.roomCode,
            }
          : undefined,
        inventorySession: result.assignment?.group?.subInventory
          ?.inventorySessionUnit?.inventorySession
          ? {
              id: result.assignment.group.subInventory.inventorySessionUnit
                .inventorySession.id,
              name: result.assignment.group.subInventory.inventorySessionUnit
                .inventorySession.name,
              year: result.assignment.group.subInventory.inventorySessionUnit
                .inventorySession.year,
            }
          : undefined,
        fileUrls:
          result.fileUrls?.map((fileUrl) => ({
            id: fileUrl.id,
            url: fileUrl.url,
            createdAt: fileUrl.createdAt,
          })) || [],
        assignment: undefined,
      }));

      const data = plainToInstance(
        LiquidationProposedInventoryResultDto,
        transformedResults,
        {
          excludeExtraneousValues: true,
        }
      ) as LiquidationProposedInventoryResultDto[];

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return new PaginatedResponseDto(data, pagination);
    } catch (e) {
      throw e;
    }
  }

  async createAssetBookFromInventoryResults(
    createDto: CreateAssetBookFromInventoryDto,
    currentUser: User
  ): Promise<AssetBookResponseDto> {
    const { assignmentId, year, roomIds, note } = createDto;

    try {
      const assignment = await this.inventoryGroupAssignmentRepository.findOne({
        where: { id: assignmentId },
        relations: [
          "unit",
          "group",
          "group.subInventory",
          "group.subInventory.inventorySessionUnit",
          "group.subInventory.inventorySessionUnit.inventorySession",
        ],
      });

      if (!assignment) {
        throw new NotFoundException(
          `Không tìm thấy phân công kiểm kê với ID ${assignmentId}`
        );
      }

      const accessibleUnitIds =
        await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (!accessibleUnitIds.includes(assignment.unitId)) {
        throw new BadRequestException(
          "Bạn không có quyền tạo sổ tài sản cho đơn vị này"
        );
      }

      const existingAssetBook = await this.assetBookRepository.findOne({
        where: { unitId: assignment.unitId, year },
      });

      if (existingAssetBook) {
        throw new BadRequestException(
          `Sổ tài sản năm ${year} cho đơn vị ${assignment.unit.name} đã tồn tại`
        );
      }

      const inventoryResultsQuery = this.inventoryResultRepository
        .createQueryBuilder("result")
        .leftJoinAndSelect("result.asset", "asset")
        .leftJoinAndSelect("result.room", "room")
        .leftJoinAndSelect("asset.category", "category")
        .where("result.assignmentId = :assignmentId", { assignmentId })
        .andWhere("result.status IN (:...statuses)", {
          statuses: [
            InventoryResultStatus.MATCHED,
            InventoryResultStatus.EXCESS,
            InventoryResultStatus.NEEDS_REPAIR,
            InventoryResultStatus.BROKEN,
          ],
        })
        .andWhere("result.countedQuantity > 0");

      if (roomIds && roomIds.length > 0) {
        inventoryResultsQuery.andWhere("result.roomId IN (:...roomIds)", {
          roomIds,
        });
      }

      const inventoryResults = await inventoryResultsQuery.getMany();

      if (inventoryResults.length === 0) {
        throw new BadRequestException(
          "Không có kết quả kiểm kê hợp lệ để tạo sổ tài sản"
        );
      }

      return await this.dataSource.transaction(async (manager) => {
        const assetBook = manager.create(AssetBook, {
          unitId: assignment.unitId,
          year,
          status: AssetBookStatus.OPEN,
          lookedAt: null,
          note:
            note ||
            `Sổ tài sản năm ${year} được tạo từ kết quả kiểm kê của ${assignment.group?.name || "nhóm kiểm kê"}`,
        });

        const savedAssetBook = await manager.save(assetBook);

        const assetBookItems: AssetBookItem[] = [];

        for (const result of inventoryResults) {
          let itemStatus = AssetBookItemStatus.IN_USE;
          let itemNote = result.note || "";

          switch (result.status) {
            case InventoryResultStatus.MATCHED:
              itemStatus = AssetBookItemStatus.IN_USE;
              break;
            case InventoryResultStatus.EXCESS:
              itemStatus = AssetBookItemStatus.IN_USE;
              itemNote = itemNote
                ? `${itemNote} (Tài sản thừa từ kiểm kê)`
                : "Tài sản thừa từ kiểm kê";
              break;
            case InventoryResultStatus.NEEDS_REPAIR:
              itemStatus = AssetBookItemStatus.DAMAGED;
              itemNote = itemNote
                ? `${itemNote} (Cần sửa chữa)`
                : "Cần sửa chữa";
              break;
            case InventoryResultStatus.BROKEN:
              itemStatus = AssetBookItemStatus.DAMAGED;
              itemNote = itemNote ? `${itemNote} (Hư hỏng)` : "Hư hỏng";
              break;
          }

          const assetBookItem = manager.create(AssetBookItem, {
            bookId: savedAssetBook.id,
            assetId: result.assetId,
            roomId: result.roomId,
            quantity: result.countedQuantity,
            status: itemStatus,
            assignedAt: new Date(),
            note: itemNote,
          });

          assetBookItems.push(assetBookItem);
        }

        await manager.save(assetBookItems);

        const createdAssetBook = await manager.findOne(AssetBook, {
          where: { id: savedAssetBook.id },
          relations: [
            "unit",
            "items",
            "items.asset",
            "items.room",
            "items.asset.rfidTag",
          ],
        });

        if (!createdAssetBook) {
          throw new NotFoundException(
            `Asset book with ID ${savedAssetBook.id} not found`
          );
        }

        return this.transformToResponseDto(createdAssetBook);
      });
    } catch (error) {
      throw error;
    }
  }

  async exportAssetBookToExcel_FirstPageOnly(
    type: AssetType,
    unitId: string,
    year: number,
    currentUser: User
  ): Promise<Buffer> {
    try {
      // --- CHECK PERM ---
      const accessibleUnitIds =
        await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (!accessibleUnitIds.includes(unitId)) {
        throw new BadRequestException("Bạn không có quyền truy cập đơn vị này");
      }

      // --- UNIT ---
      const unit = await this.unitRepository.findOne({
        where: { id: unitId },
      });
      if (!unit) {
        throw new NotFoundException(`Không tìm thấy đơn vị với ID ${unitId}`);
      }

      // --- LẤY DỮ LIỆU TÀI SẢN ---
      const assetBook = await this.assetBookRepository.findOne({
        where: { unitId, year },
        relations: [
          "items",
          "items.asset",
          "items.asset.category",
          "items.room",
          "items.asset.currentRoom",
        ],
      });

      let assetBookItems: AssetBookItem[] = [];
      if (assetBook && assetBook.items) {
        assetBookItems = assetBook.items.filter(
          (item) => item.asset && item.asset.type === type
        );
      }

      // --- WORKBOOK / SHEET ---
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Sổ tài sản");

      // ================================
      //   PAGE SETUP (A4 - LANDSCAPE) - SIMPLIFIED
      // ================================
      try {
        ws.pageSetup = {
          paperSize: 9,
          orientation: "landscape",
          margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
          },
          horizontalCentered: true,
          verticalCentered: false,
          fitToPage: true, // Tự động fit vào trang
          fitToHeight: 0, // Không giới hạn số trang theo chiều dọc
          fitToWidth: 1, // Fit vào 1 trang theo chiều ngang
        };

        ws.views = [
          {
            showGridLines: true,
            showRowColHeaders: true,
            state: "normal",
          },
        ];
      } catch (setupError) {
        ws.pageSetup = {
          paperSize: 9,
          orientation: "landscape",
        };
      }

      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.font = { name: "Times New Roman" };
        });
      });

      // ================================
      //         COLUMN WIDTH
      // ================================
      ws.columns = Array.from({ length: 17 }).map(() => ({ width: 12 }));
      ws.getColumn(1).width = 8; // A
      ws.getColumn(2).width = 8; // B

      // ================================
      //          LOGO
      // ================================
      const possibleLogoPaths = [
        "./public/logo_iuh_full.png",
        "public/logo_iuh_full.png",
        process.cwd() + "/public/logo_iuh_full.png",
        __dirname + "/../../../public/logo_iuh_full.png",
      ];
      let logoPath: string | null = null;
      for (const path of possibleLogoPaths) {
        if (fs.existsSync(path)) {
          logoPath = path;
          break;
        }
      }

      if (logoPath) {
        const logoId = workbook.addImage({
          filename: logoPath,
          extension: "png",
        });

        ws.addImage(logoId, {
          tl: { col: 1, row: 1 }, // B2
          ext: { width: 270, height: 110 },
        });
      }

      const set = (
        cell: string,
        value: string | null | undefined,
        font: Partial<ExcelJS.Font>,
        height?: number
      ) => {
        const c = ws.getCell(cell);
        c.value = value || "";
        c.font = { name: "Times New Roman", ...font };
        c.alignment = { horizontal: "center" };

        if (height !== undefined) {
          const rowNumber = typeof c.row === "string" ? parseInt(c.row) : c.row;
          ws.getRow(rowNumber).height = height;
        }
      };

      ws.mergeCells("D2", "N2");
      set("D2", "BỘ CÔNG THƯƠNG", { bold: true, size: 16 });

      ws.mergeCells("D3", "N3");
      set("D3", "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP THÀNH PHỐ HỒ CHÍ MINH", {
        bold: true,
        size: 14,
      });

      ws.mergeCells("D4", "N4");
      set("D4", "PHÒNG QUẢN TRỊ", { bold: true, size: 14 });

      ws.mergeCells("D5", "N5");
      set(
        "D5",
        "12 Nguyễn Văn Bảo - Phường 04 - Quận Gò Vấp, Tp. Hồ Chí Minh",
        { size: 12 }
      );

      ws.mergeCells("D6", "N6");
      set("D6", "Tel: (08) 38940390 - Website: http://www.iuh.edu.vn", {
        size: 12,
      });

      ws.mergeCells("A10", "P10");
      set(`A10`, `SỔ TÀI SẢN NĂM ${year}`, { size: 20, bold: true });

      ws.mergeCells("A13", "P13");
      const unitName = unit?.name || "N/A";
      set(`A13`, `ĐƠN VỊ: ${unitName.toUpperCase()}`, { size: 16, bold: true });

      // ================================
      //          CHỮ KÝ
      // ================================
      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const yearCur = now.getFullYear();
      set("M18", `Ngày ${day} tháng ${month} năm ${yearCur}`, {
        size: 11,
      });
      set("C19", "TRƯỞNG ĐƠN VỊ", { size: 11, bold: true });

      set("G19", "PHÒNG QUẢN TRỊ", { size: 11, bold: true });

      set("M19", "BAN GIÁM HIỆU", { size: 11, bold: true });

      set("M20", "HIỆU TRƯỞNG", { size: 11, bold: true });

      // ================================
      //    PAGE SETTING - TRANG 1 ĐẾN DÒNG 29
      // ================================
      // Trang 1 sẽ kết thúc tại dòng 29, trang 2 bắt đầu từ dòng 30 với dữ liệu
      // ws.pageSetup.printArea = "A1:Q29";

      // ================================
      //       HEADER BẢNG DỮ LIỆU (từ dòng 30 - TRANG 2)
      // ================================
      
      ws.getCell("A38").value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH";
      ws.getCell("A38").font = {
        name: "Times New Roman",
        size: 12,
        bold: true,
      };

      ws.getCell("A39").value =
        "12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh";
      ws.getCell("A39").font = { name: "Times New Roman", size: 11 };

      // Sổ tài sản
      ws.mergeCells("A41:P41");
      ws.getCell("A41").value = "SỔ TÀI SẢN CỐ ĐỊNH";
      ws.getCell("A41").font = {
        name: "Times New Roman",
        size: 14,
        bold: true,
      };
      ws.getCell("A41").alignment = { horizontal: "center" };

      // Năm:
      ws.mergeCells("A42:P42");
      ws.getCell("A42").value = `NĂM: ${year}`;
      ws.getCell("A42").font = {
        name: "Times New Roman",
        size: 14,
        bold: true,
      };
      ws.getCell("A42").alignment = { horizontal: "center" };

      ws.mergeCells("A43:P43");
      ws.getCell("A43").value = unit.name;
      ws.getCell("A43").font = {
        name: "Times New Roman",
        size: 14,
        bold: true,
      };
      ws.getCell("A43").alignment = { horizontal: "center" };

      let currentRow = 45;

      // ================================
      //       HEADER BẢNG DỮ LIỆU (MERGE CỘT ĐỂ BỐ CỤC ĐẸP)
      // ================================
      
      // Tạo header với merge cells để trải rộng đến cột P
      ws.getCell(currentRow, 1).value = "Stt"; // A
      
      ws.getCell(currentRow, 2).value = "Mã TSCĐ"; // B
      ws.getCell(currentRow, 3).value = "Mã KT"; // C
      
      ws.getCell(currentRow, 4).value = "Mã vị trí"; // D
      
      ws.mergeCells(`E${currentRow}:G${currentRow}`); // E-G  
      ws.getCell(currentRow, 5).value = "Tên TSCĐ";
      
      ws.mergeCells(`H${currentRow}:J${currentRow}`); // H-J
      ws.getCell(currentRow, 8).value = "Thông số KT";
      
      ws.getCell(currentRow, 11).value = "Nước SX"; // K
      ws.getCell(currentRow, 12).value = "ĐVT"; // L
      ws.getCell(currentRow, 13).value = "Số lượng"; // M
      
      ws.mergeCells(`N${currentRow}:P${currentRow}`); // N-P
      ws.getCell(currentRow, 14).value = "Ghi chú";

      // Style cho tất cả header cells từ A đến P
      for (let col = 1; col <= 16; col++) {
        const cell = ws.getCell(currentRow, col);
        cell.font = { name: "Times New Roman", bold: true, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },  
          left: { style: "thin" },
          right: { style: "thin" },
        };
      }
      ws.getRow(currentRow).height = 23;

      currentRow++;

      // ================================
      //            DỮ LIỆU (THEO LAYOUT MỚI)
      // ================================
      if (assetBookItems?.length > 0) {
        assetBookItems.forEach((item, index) => {
          const asset = item.asset;
          
          // STT (A)
          ws.getCell(currentRow, 1).value = index + 1;
          
          // Mã TSCĐ (B)
          ws.getCell(currentRow, 2).value = asset?.fixedCode || "";
          
          // Mã KT (C)
          ws.getCell(currentRow, 3).value = asset?.ktCode || "";
          
          // Mã vị trí (D) - sử dụng roomCode từ item.room hoặc asset.currentRoom
          const roomCode = item.room?.roomCode || asset?.currentRoom?.roomCode || "";
          ws.getCell(currentRow, 4).value = roomCode;
          
          // Tên TSCĐ (E-G merged)
          ws.mergeCells(`E${currentRow}:G${currentRow}`);
          ws.getCell(currentRow, 5).value = asset?.name || "";
          
          // Thông số KT (H-J merged)
          ws.mergeCells(`H${currentRow}:J${currentRow}`);
          ws.getCell(currentRow, 8).value = asset?.specs || "";
          
          // Nước SX (K)
          ws.getCell(currentRow, 11).value = asset?.origin || "";
          
          // ĐVT (L)
          ws.getCell(currentRow, 12).value = asset?.unit || "";
          
          // Số lượng (M)
          ws.getCell(currentRow, 13).value = item.quantity || 0;
          
          // Ghi chú (N-P merged)
          ws.mergeCells(`N${currentRow}:P${currentRow}`);
          ws.getCell(currentRow, 14).value = item.note || "";

          for (let col = 1; col <= 16; col++) {
            const cell = ws.getCell(currentRow, col);
            cell.font = { name: "Times New Roman", size: 10 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
          }

          currentRow++;
        });
      } else {
        ws.mergeCells(`A${currentRow}:P${currentRow}`);
        const c = ws.getCell(currentRow, 1);
        c.value = "Không có dữ liệu tài sản";
        c.font = { name: "Times New Roman", italic: true, size: 11 };
        c.alignment = { horizontal: "center", vertical: "middle" };
      }

      // ================================
      //       COLUMN WIDTH (CẬP NHẬT CHO LAYOUT MỚI)
      // ================================
      ws.getColumn(1).width = 5;   // A - STT
      ws.getColumn(2).width = 12;  // B - Mã TSCĐ
      ws.getColumn(3).width = 10;  // C - Mã KT
      ws.getColumn(4).width = 10;  // D - Mã vị trí
      ws.getColumn(5).width = 12;  // E - Tên TSCĐ (part 1)
      ws.getColumn(6).width = 12;  // F - Tên TSCĐ (part 2)
      ws.getColumn(7).width = 12;  // G - Tên TSCĐ (part 3)
      ws.getColumn(8).width = 10;  // H - Thông số KT (part 1)
      ws.getColumn(9).width = 10;  // I - Thông số KT (part 2)
      ws.getColumn(10).width = 10; // J - Thông số KT (part 3)
      ws.getColumn(11).width = 10; // K - Nước SX
      ws.getColumn(12).width = 8;  // L - ĐVT
      ws.getColumn(13).width = 8;  // M - Số lượng
      ws.getColumn(14).width = 8;  // N - Ghi chú (part 1)
      ws.getColumn(15).width = 8;  // O - Ghi chú (part 2)
      ws.getColumn(16).width = 8;  // P - Ghi chú (part 3)

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (e) {
      throw e;
    }
  }

  async exportAssetBookToExcel(
    type: AssetType,
    unitId: string,
    year: number,
    currentUser: User
  ): Promise<Buffer> {
    try {
      const accessibleUnitIds =
        await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (!accessibleUnitIds.includes(unitId)) {
        throw new BadRequestException("Bạn không có quyền truy cập đơn vị này");
      }

      const unit = await this.unitRepository.findOne({
        where: { id: unitId },
        relations: ["parentUnit"],
      });

      if (!unit) {
        throw new NotFoundException(`Không tìm thấy đơn vị với ID ${unitId}`);
      }

      const assetBook = await this.assetBookRepository.findOne({
        where: { unitId, year },
        relations: [
          "unit",
          "items",
          "items.asset",
          "items.room",
          "items.asset.category",
          "items.asset.rfidTag",
        ],
      });

      if (!assetBook) {
        throw new NotFoundException(
          `Không tìm thấy sổ tài sản cho đơn vị ${unit.name} năm ${year}`
        );
      }

      const filteredItems = assetBook.items.filter(
        (item) =>
          item.asset.type === type && item.status === AssetBookItemStatus.IN_USE
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sổ tài sản");

      const assetTypeText =
        type === AssetType.FIXED_ASSET ? "Tài sản cố định" : "Công cụ dụng cụ";

      worksheet.mergeCells("A1:H1");
      worksheet.getCell("A1").value = "SỔ THEO DÕI TÀI SẢN";
      worksheet.getCell("A1").font = { bold: true, size: 16 };
      worksheet.getCell("A1").alignment = { horizontal: "center" };

      worksheet.mergeCells("A2:H2");
      worksheet.getCell("A2").value = `Loại: ${assetTypeText}`;
      worksheet.getCell("A2").font = { bold: true, size: 12 };
      worksheet.getCell("A2").alignment = { horizontal: "center" };

      worksheet.mergeCells("A3:H3");
      worksheet.getCell("A3").value = `Đơn vị: ${unit.name}`;
      worksheet.getCell("A3").font = { bold: true, size: 12 };
      worksheet.getCell("A3").alignment = { horizontal: "center" };

      worksheet.mergeCells("A4:H4");
      worksheet.getCell("A4").value = `Năm: ${year}`;
      worksheet.getCell("A4").font = { bold: true, size: 12 };
      worksheet.getCell("A4").alignment = { horizontal: "center" };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow([
        "STT",
        "Mã tài sản",
        "Tên tài sản",
        "Thông số kỹ thuật",
        "Đơn vị tính",
        "Số lượng",
        "Phòng",
        "Ghi chú",
      ]);

      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      filteredItems.forEach((item, index) => {
        const assetCode =
          type === AssetType.FIXED_ASSET
            ? item.asset.fixedCode
            : item.asset.ktCode;

        const dataRow = worksheet.addRow([
          index + 1,
          assetCode || "",
          item.asset.name || "",
          item.asset.specs || "",
          item.asset.unit || "",
          item.quantity || 0,
          item.room?.roomCode || "",
          item.note || "",
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (colNumber === 1 || colNumber === 6) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }
        });
      });

      worksheet.columns = [
        { width: 5 },
        { width: 15 },
        { width: 30 },
        { width: 25 },
        { width: 12 },
        { width: 10 },
        { width: 15 },
        { width: 20 },
      ];

      const totalRow = worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        "",
        "",
        "",
        "",
        "Tổng cộng:",
        filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
        "",
        "",
      ]);

      summaryRow.getCell(5).font = { bold: true };
      summaryRow.getCell(6).font = { bold: true };
      summaryRow.getCell(6).alignment = { horizontal: "center" };

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      throw error;
    }
  }
}
