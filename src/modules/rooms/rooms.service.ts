import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { RoomResponseDto } from "./dto/room-response.dto";
import { Room } from "src/entities/room.entity";
import { Unit } from "src/entities/unit.entity";
import { plainToInstance } from "class-transformer";
import { User } from "src/entities/user.entity";

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
        adjRoom.adjacentRooms = [...(adjRoom.adjacentRooms ?? []), savedRoom];
        await this.roomRepository.save(adjRoom);
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

    Object.assign(room, updateRoomDto);
    room.roomCode = await this.generateRoomCode(
      room.building,
      room.floor,
      room.roomNumber,
      room.unitId
    );
    // Handle adjacent rooms if provided
    if (
      updateRoomDto.adjacentRoomIds &&
      updateRoomDto.adjacentRoomIds.length > 0
    ) {
      const adjacentRooms = await this.roomRepository.findBy({
        id: In(updateRoomDto.adjacentRoomIds),
      });
      room.adjacentRooms = adjacentRooms;
    }
    const updatedRoom = await this.roomRepository.save(room);

    // If there are adjacent rooms, update their adjacentRooms to include this new room
    if (room.adjacentRooms?.length > 0) {
      for (const adjRoom of room.adjacentRooms) {
        adjRoom.adjacentRooms = [...(adjRoom.adjacentRooms ?? []), room];
        await this.roomRepository.save(adjRoom);
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
