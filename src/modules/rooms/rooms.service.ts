import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, SelectQueryBuilder } from "typeorm";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { RoomResponseDto } from "./dto/room-response.dto";
import { RoomFilterDto } from "./dto/room-filter.dto";
import { Room } from "src/entities/room.entity";
import { Unit } from "src/entities/unit.entity";
import { plainToInstance } from "class-transformer";
import { User } from "src/entities/user.entity";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { FilterConfig, FilterUtil } from "src/common/utils/filter.util";
import { FieldType } from "src/common/dto/filter.dto";

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>
  ) {}

  async create(
    createRoomDto: CreateRoomDto,
    currentUser?: User
  ): Promise<RoomResponseDto> {
    // Check if unit exists if unitId is provided
    if (createRoomDto.unitId) {
      const unit = await this.unitRepository.findOne({
        where: { id: createRoomDto.unitId },
      });

      if (!unit) {
        throw new NotFoundException("Unit not found");
      }
    }

    // Check for unique room location constraint
    const existingLocation = await this.roomRepository.findOne({
      where: {
        building: createRoomDto.building,
        floor: createRoomDto.floor,
        roomNumber: createRoomDto.roomNumber,
      },
    });

    if (existingLocation) {
      throw new ConflictException("Room with this location already exists");
    }

    const room = this.roomRepository.create(createRoomDto);
    room.createdBy = currentUser;
    room.roomCode = await this.generateRoomCode(
      createRoomDto.building,
      createRoomDto.floor,
      createRoomDto.roomNumber,
      createRoomDto.unitId
    );

    // Handle adjacent rooms if provided
    if (
      createRoomDto.adjacentRoomIds &&
      createRoomDto.adjacentRoomIds.length > 0
    ) {
      const adjacentRooms = await this.roomRepository.findBy({
        id: In(createRoomDto.adjacentRoomIds),
      });
      room.adjacentRooms = adjacentRooms;
    }

    const savedRoom = await this.roomRepository.save(room);

    // if there are adjacent rooms, update their adjacentRooms to include this new room
    if (savedRoom.adjacentRooms?.length > 0) {
      for (const adjRoom of savedRoom.adjacentRooms) {
        const adjRoomWithRelations = await this.roomRepository.findOne({
          where: { id: adjRoom.id },
          relations: ["adjacentRooms"],
        });
        if (adjRoomWithRelations) {
          // Check if this room is already in the adjacent room's adjacentRooms
          const isAlreadyAdjacent = adjRoomWithRelations.adjacentRooms?.some(
            (existingAdjRoom) => existingAdjRoom.id === savedRoom.id
          );
          if (!isAlreadyAdjacent) {
            adjRoomWithRelations.adjacentRooms = [
              ...(adjRoomWithRelations.adjacentRooms || []),
              savedRoom,
            ];
            await this.roomRepository.save(adjRoomWithRelations);
          }
        }
      }
    }
    // Fetch the room with all relations including adjacent rooms
    const roomWithRelations = await this.roomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ["unit", "createdBy", "adjacentRooms"],
    });

    return plainToInstance(RoomResponseDto, roomWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  private async generateRoomCode(
    building: string,
    floor: string,
    roomNumber: string,
    unitId?: string
  ): Promise<string> {
    const buildingPart = building.toUpperCase();
    const floorPart = floor.padStart(2, "0");
    const roomNumberPart = roomNumber.padStart(2, "0");
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
    });
    return `${unit?.unitCode ?? ""}${buildingPart}${floorPart}.${roomNumberPart}`;
  }

  async findAll(): Promise<RoomResponseDto[]> {
    const rooms = await this.roomRepository.find({
      relations: ["unit", "adjacentRooms"],
      order: { createdAt: "DESC" },
    });

    return plainToInstance(RoomResponseDto, rooms, {
      excludeExtraneousValues: true,
    });
  }

  async findByUnitId(unitId: string): Promise<RoomResponseDto[]> {
    // Check if unit exists
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException("Unit not found");
    }

    const rooms = await this.roomRepository.find({
      where: { unitId },
      relations: ["unit", "adjacentRooms"],
      order: { createdAt: "DESC" },
    });

    return plainToInstance(RoomResponseDto, rooms, {
      excludeExtraneousValues: true,
    });
  }

  async getRoomSuggestions(
    building?: string,
    floor?: string,
    excludeUnitId?: string
  ): Promise<RoomResponseDto[]> {
    const queryBuilder = this.roomRepository
      .createQueryBuilder("room")
      .leftJoinAndSelect("room.unit", "unit")
      .leftJoinAndSelect("room.adjacentRooms", "adjacentRooms");

    // Exclude rooms from the same unit
    if (excludeUnitId) {
      queryBuilder.andWhere("room.unitId = :excludeUnitId", { excludeUnitId });
    }

    // Priority 1: Same building and same floor
    if (building && floor) {
      queryBuilder.andWhere(
        "(room.building = :building AND room.floor = :floor)",
        { building, floor }
      );
    }
    // Priority 2: Same building (different floor)
    else if (building && !floor) {
      queryBuilder.andWhere("room.building = :building", { building });
    }
    // Priority 3: Same floor (different building)
    else if (!building && floor) {
      queryBuilder.andWhere("room.floor = :floor", { floor });
    }
    // If no building or floor specified, return empty array
    else {
      return [];
    }

    queryBuilder
      .orderBy("room.building", "ASC")
      .addOrderBy("room.floor", "ASC")
      .addOrderBy("room.roomNumber", "ASC")
      .limit(20); // Limit suggestions to 20 rooms

    const rooms = await queryBuilder.getMany();

    return plainToInstance(RoomResponseDto, rooms, {
      excludeExtraneousValues: true,
    });
  }

  async filterByUnitId(
    unitId: string,
    filterDto: RoomFilterDto
  ): Promise<PaginatedResponseDto<RoomResponseDto>> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException("Unit not found");
    }

    const config: FilterConfig = {
      searchFields: ["name", "roomCode", "roomNumber"],
      fieldTypeMap: {
        name: FieldType.TEXT,
        building: FieldType.TEXT,
        floor: FieldType.TEXT,
        roomNumber: FieldType.TEXT,
        roomCode: FieldType.TEXT,
        status: FieldType.SELECT,
        createdAt: FieldType.DATE,
        updatedAt: FieldType.DATE,
      },
      defaultSorting: { field: "createdAt", direction: "DESC" as const },
      relations: ["unit", "createdBy", "adjacentRooms"],
    };

    // Handle quick filters for backward compatibility
    if (filterDto.buildingFilter || filterDto.floorFilter) {
      // Add quick filter conditions to the existing conditions
      const quickFilterConditions = [];

      if (filterDto.buildingFilter) {
        quickFilterConditions.push({
          field: "building",
          fieldType: FieldType.TEXT,
          operator: "contains",
          value: [filterDto.buildingFilter],
        });
      }

      if (filterDto.floorFilter) {
        quickFilterConditions.push({
          field: "floor",
          fieldType: FieldType.TEXT,
          operator: "contains",
          value: [filterDto.floorFilter],
        });
      }

      // Merge with existing conditions
      filterDto.conditions = [
        ...(filterDto.conditions || []),
        ...quickFilterConditions,
      ];
    }

    // Add unit filter condition
    const unitFilterCondition = {
      field: "unitId",
      fieldType: FieldType.TEXT,
      operator: "equals",
      value: [unitId],
    };

    filterDto.conditions = [
      ...(filterDto.conditions || []),
      unitFilterCondition,
    ];

    return FilterUtil.getFilteredResults(
      this.roomRepository,
      filterDto,
      RoomResponseDto,
      config,
      "room"
    );
  }

  private applyAdvancedFilters(
    queryBuilder: SelectQueryBuilder<Room>,
    filterDto: RoomFilterDto
  ): void {
    const conditionLogic = filterDto.conditionLogic || "and";

    filterDto.conditions?.forEach((condition, index) => {
      if (!condition.field || !condition.operator) return;

      const paramName = `condition_${index}`;
      const fieldName = `room.${condition.field}`;

      switch (condition.operator) {
        case "equals":
          if (condition.value && condition.value.length > 0) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](`${fieldName} = :${paramName}`, {
              [paramName]: condition.value[0],
            });
          }
          break;

        case "contains":
          if (condition.value && condition.value.length > 0) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](`${fieldName} ILIKE :${paramName}`, {
              [paramName]: `%${condition.value[0]}%`,
            });
          }
          break;

        case "in":
          if (condition.value && condition.value.length > 0) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](`${fieldName} IN (:...${paramName})`, {
              [paramName]: condition.value,
            });
          }
          break;

        case "between":
          if (condition.dateFrom && condition.dateTo) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](
              `${fieldName} BETWEEN :${paramName}_from AND :${paramName}_to`,
              {
                [`${paramName}_from`]: condition.dateFrom,
                [`${paramName}_to`]: condition.dateTo,
              }
            );
          }
          break;

        case "greaterThan":
          if (condition.value && condition.value.length > 0) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](`${fieldName} > :${paramName}`, {
              [paramName]: condition.value[0],
            });
          }
          break;

        case "lessThan":
          if (condition.value && condition.value.length > 0) {
            const whereMethod =
              index === 0 || conditionLogic === "and" ? "andWhere" : "orWhere";
            queryBuilder[whereMethod](`${fieldName} < :${paramName}`, {
              [paramName]: condition.value[0],
            });
          }
          break;
      }
    });
  }

  async findOne(id: string): Promise<RoomResponseDto> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ["unit", "createdBy", "adjacentRooms"],
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    return plainToInstance(RoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateRoomDto: UpdateRoomDto
  ): Promise<RoomResponseDto> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ["adjacentRooms"], // Load existing adjacent rooms
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    // Check if unit exists if unitId is provided
    if (updateRoomDto.unitId) {
      const unit = await this.unitRepository.findOne({
        where: { id: updateRoomDto.unitId },
      });

      if (!unit) {
        throw new NotFoundException("Unit not found");
      }
    }

    // Check for unique room location constraint (excluding current room)
    if (
      updateRoomDto.building ??
      updateRoomDto.floor ??
      updateRoomDto.roomNumber
    ) {
      const building = updateRoomDto.building ?? room.building;
      const floor = updateRoomDto.floor ?? room.floor;
      const roomNumber = updateRoomDto.roomNumber ?? room.roomNumber;

      const existingLocation = await this.roomRepository.findOne({
        where: {
          building,
          floor,
          roomNumber,
        },
      });

      if (existingLocation && existingLocation.id !== id) {
        throw new ConflictException("Room with this location already exists");
      }
    }

    // Store old adjacent rooms for cleanup
    const oldAdjacentRooms = room.adjacentRooms || [];

    Object.assign(room, updateRoomDto);
    room.roomCode = await this.generateRoomCode(
      room.building,
      room.floor,
      room.roomNumber,
      room.unitId
    );

    // Handle adjacent rooms update
    if (updateRoomDto.adjacentRoomIds !== undefined) {
      if (updateRoomDto.adjacentRoomIds.length > 0) {
        const adjacentRooms = await this.roomRepository.findBy({
          id: In(updateRoomDto.adjacentRoomIds),
        });
        room.adjacentRooms = adjacentRooms;
      } else {
        // If empty array is provided, clear all adjacent rooms
        room.adjacentRooms = [];
      }
    }

    const updatedRoom = await this.roomRepository.save(room);

    // Remove this room from old adjacent rooms that are no longer selected
    const newAdjacentRoomIds = new Set(updateRoomDto.adjacentRoomIds || []);
    for (const oldAdjRoom of oldAdjacentRooms) {
      if (!newAdjacentRoomIds.has(oldAdjRoom.id)) {
        // Remove the current room from this old adjacent room's adjacentRooms
        const oldAdjRoomWithRelations = await this.roomRepository.findOne({
          where: { id: oldAdjRoom.id },
          relations: ["adjacentRooms"],
        });
        if (oldAdjRoomWithRelations) {
          oldAdjRoomWithRelations.adjacentRooms = oldAdjRoomWithRelations.adjacentRooms?.filter(
            (adjRoom) => adjRoom.id !== room.id
          ) || [];
          await this.roomRepository.save(oldAdjRoomWithRelations);
        }
      }
    }

    // Add this room to new adjacent rooms
    if (room.adjacentRooms?.length > 0) {
      for (const adjRoom of room.adjacentRooms) {
        const adjRoomWithRelations = await this.roomRepository.findOne({
          where: { id: adjRoom.id },
          relations: ["adjacentRooms"],
        });
        if (adjRoomWithRelations) {
          // Check if this room is already in the adjacent room's adjacentRooms
          const isAlreadyAdjacent = adjRoomWithRelations.adjacentRooms?.some(
            (existingAdjRoom) => existingAdjRoom.id === room.id
          );
          if (!isAlreadyAdjacent) {
            adjRoomWithRelations.adjacentRooms = [
              ...(adjRoomWithRelations.adjacentRooms || []),
              room,
            ];
            await this.roomRepository.save(adjRoomWithRelations);
          }
        }
      }
    }

    const roomWithRelations = await this.roomRepository.findOne({
      where: { id: updatedRoom.id },
      relations: ["unit", "createdBy", "adjacentRooms"],
    });

    return plainToInstance(RoomResponseDto, roomWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    await this.roomRepository.softDelete(id);
  }
}
