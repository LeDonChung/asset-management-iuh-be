import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Asset } from '../../entities/asset.entity';
import { Unit } from '../../entities/unit.entity';
import { Room } from '../../entities/room.entity';
import { Category } from '../../entities/category.entity';
import { AssetBook } from '../../entities/asset-book.entity';
import { AssetBookItem } from '../../entities/asset-book-item.entity';
import { AssetBookStatus } from '../../common/shared/AssetBookStatus';
import { AssetBookItemStatus } from '../../common/shared/AssetBookItemStatus';
import { OpenAIService } from './openai.service';
import { ChatMessageDto, ChatResponseDto } from './dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(AssetBook)
    private assetBookRepository: Repository<AssetBook>,
    @InjectRepository(AssetBookItem)
    private assetBookItemRepository: Repository<AssetBookItem>,
    private openAIService: OpenAIService,
    private configService: ConfigService,
  ) {}

  async chat(chatMessageDto: ChatMessageDto, userId: string): Promise<ChatResponseDto> {
    const { message, unitId, conversationHistory = [] } = chatMessageDto;

    this.logger.log(`Processing chat message from user ${userId}: ${message}`);

    try {
      const contextData = await this.getContextData(message, unitId);

      const systemPrompt = this.buildSystemPrompt(contextData);

      const truncatedMessage = message.length > 500 ? message.substring(0, 500) + '...' : message;
      const truncatedHistory = conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content,
      }));

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...truncatedHistory,
        { role: 'user' as const, content: truncatedMessage },
      ];

      const { response, retryCount, keyUsed } = await this.openAIService.chat(
        messages,
        0.7,
        1000
      );

      return {
        message: response,
        data: contextData,
        timestamp: new Date(),
        retryCount,
        keyUsed,
      };
    } catch (error) {
      this.logger.error('Error processing chat message', error);
      throw error;
    }
  }

  private async getContextData(message: string, unitId?: string): Promise<any> {
    const lowerMessage = message.toLowerCase();
    const contextData: any = {};

    try {
      if (
        lowerMessage.includes('bao nhiêu') ||
        lowerMessage.includes('thống kê') ||
        lowerMessage.includes('số lượng') ||
        lowerMessage.includes('tổng')
      ) {
        if (unitId || lowerMessage.includes('đơn vị')) {
          contextData.assetsByUnit = await this.getAssetsByUnit(unitId);
        } else {
          contextData.totalAssets = await this.assetRepository.count({
            where: { deletedAt: null },
          });
        }

        contextData.assetsByCategory = await this.getAssetsByCategory(unitId);

        contextData.assetsByStatus = await this.getAssetsByStatus(unitId);
      }

      if (
        lowerMessage.includes('ở đâu') ||
        lowerMessage.includes('nằm') ||
        lowerMessage.includes('vị trí') ||
        lowerMessage.includes('phòng') ||
        lowerMessage.includes('tìm')
      ) {
        contextData.assetLocations = await this.findAssetLocations(message, unitId);
      }

      if (lowerMessage.includes('đơn vị')) {
        contextData.units = await this.unitRepository.find({
          where: { deletedAt: null },
          select: ['id', 'name', 'unitCode', 'type', 'status'],
        });
      }

      if (lowerMessage.includes('phòng')) {
        const roomQuery = this.roomRepository
          .createQueryBuilder('room')
          .leftJoinAndSelect('room.unit', 'unit')
          .where('room.deletedAt IS NULL')
          .select([
            'room.id',
            'room.name',
            'room.roomCode',
            'room.building',
            'room.floor',
            'unit.id',
            'unit.name',
          ]);

        if (unitId) {
          roomQuery.andWhere('room.unitId = :unitId', { unitId });
        }

        contextData.rooms = await roomQuery.getMany();

        const roomCodeMatch = message.match(/[A-Z]?\d+[A-Z]?\d*\.?\d*/gi);
        if (roomCodeMatch && roomCodeMatch.length > 0) {
          const roomCode = roomCodeMatch[0];
          contextData.assetsInRoom = await this.getAssetsByRoom(roomCode, unitId);
        }
      }

      if (
        lowerMessage.includes('loại') ||
        lowerMessage.includes('danh mục') ||
        lowerMessage.includes('máy tính') ||
        lowerMessage.includes('thiết bị')
      ) {
        contextData.categories = await this.categoryRepository.find({
          where: { deletedAt: null },
          select: ['id', 'name', 'code'],
        });
      }

      return contextData;
    } catch (error) {
      this.logger.error('Error getting context data', error);
      return {};
    }
  }

  private async getAssetsByUnit(unitId?: string): Promise<any[]> {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoin('asset.currentRoom', 'room')
      .leftJoin('room.unit', 'unit')
      .where('asset.deletedAt IS NULL')
      .select('unit.id', 'unitId')
      .addSelect('unit.name', 'unitName')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .groupBy('unit.id')
      .addGroupBy('unit.name');

    if (unitId) {
      query.andWhere('unit.id = :unitId', { unitId });
    }

    return await query.getRawMany();
  }

  private async getAssetsByCategory(unitId?: string): Promise<any[]> {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoin('asset.category', 'category')
      .where('asset.deletedAt IS NULL')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .groupBy('category.id')
      .addGroupBy('category.name');

    if (unitId) {
      query
        .leftJoin('asset.currentRoom', 'room')
        .andWhere('room.unitId = :unitId', { unitId });
    }

    return await query.getRawMany();
  }

  private async getAssetsByStatus(unitId?: string): Promise<any[]> {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.deletedAt IS NULL')
      .select('asset.status', 'status')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .groupBy('asset.status');

    if (unitId) {
      query
        .leftJoin('asset.currentRoom', 'room')
        .andWhere('room.unitId = :unitId', { unitId });
    }

    return await query.getRawMany();
  }

  private async getAssetsByRoom(roomCode: string, unitId?: string): Promise<any> {
    const roomQuery = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.unit', 'unit')
      .where('room.deletedAt IS NULL')
      .andWhere('room.roomCode ILIKE :roomCode', { roomCode: `%${roomCode}%` });

    if (unitId) {
      roomQuery.andWhere('room.unitId = :unitId', { unitId });
    }

    const room = await roomQuery.getOne();

    if (!room) {
      return null;
    }

    const assetsQuery = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.currentRoom', 'currentRoom')
      .where('asset.deletedAt IS NULL')
      .andWhere('asset.currentRoomId = :roomId', { roomId: room.id });

    const assets = await assetsQuery.getMany();

    const assetsByCategory = assets.reduce((acc, asset) => {
      const categoryName = asset.category?.name || 'Chưa phân loại';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push({
        name: asset.name,
        ktCode: asset.ktCode,
        fixedCode: asset.fixedCode,
        status: asset.status,
        quantity: asset.quantity,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      room: {
        name: room.name,
        roomCode: room.roomCode,
        building: room.building,
        floor: room.floor,
        unit: room.unit?.name,
      },
      totalAssets: assets.length,
      assetsByCategory,
      assets: assets.map(asset => ({
        name: asset.name,
        ktCode: asset.ktCode,
        fixedCode: asset.fixedCode,
        category: asset.category?.name,
        status: asset.status,
        quantity: asset.quantity,
        type: asset.type,
      })),
    };
  }

  private async findAssetLocations(query: string, unitId?: string): Promise<any[]> {
    const searchTerms = this.extractSearchTerms(query);

    if (searchTerms.length === 0) {
      return [];
    }

    const results: any[] = [];
    const foundAssetIds = new Set<string>();

    const qb = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.currentRoom', 'room')
      .leftJoinAndSelect('room.unit', 'unit')
      .leftJoinAndSelect('asset.category', 'category')
      .where('asset.deletedAt IS NULL');

    const conditions = searchTerms
      .map((_, index) => {
        return `(asset.name ILIKE :term${index} OR asset.ktCode ILIKE :term${index} OR asset.fixedCode ILIKE :term${index})`;
      })
      .join(' OR ');

    if (conditions) {
      qb.andWhere(`(${conditions})`, 
        Object.fromEntries(
          searchTerms.map((term, index) => [`term${index}`, `%${term}%`])
        )
      );
    }

    if (unitId) {
      qb.andWhere('room.unitId = :unitId', { unitId });
    }

    qb.take(5);

    const regularAssets = await qb.getMany();
    regularAssets.forEach(asset => {
      results.push(asset);
      foundAssetIds.add(asset.id);
    });

    const currentYear = new Date().getFullYear();
    const bookQuery = this.assetBookRepository
      .createQueryBuilder('book')
      .where('book.year = :year', { year: currentYear })
      .andWhere('book.status = :status', { status: AssetBookStatus.OPEN });

    if (unitId) {
      bookQuery.andWhere('book.unitId = :unitId', { unitId });
    }

    const currentBooks = await bookQuery.getMany();

    if (currentBooks.length > 0) {
      const bookIds = currentBooks.map(book => book.id);

      const bookItemQuery = this.assetBookItemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.asset', 'asset')
        .leftJoinAndSelect('item.room', 'room')
        .leftJoinAndSelect('room.unit', 'unit')
        .leftJoinAndSelect('asset.category', 'category')
        .where('item.bookId IN (:...bookIds)', { bookIds })
        .andWhere('item.status = :status', { status: AssetBookItemStatus.IN_USE })
        .andWhere('asset.deletedAt IS NULL');

      const bookConditions = searchTerms
        .map((_, index) => {
          return `(asset.name ILIKE :term${index} OR asset.ktCode ILIKE :term${index} OR asset.fixedCode ILIKE :term${index})`;
        })
        .join(' OR ');

      if (bookConditions) {
        bookItemQuery.andWhere(`(${bookConditions})`, 
          Object.fromEntries(
            searchTerms.map((term, index) => [`term${index}`, `%${term}%`])
          )
        );
      }

      bookItemQuery.take(5);

      const bookItems = await bookItemQuery.getMany();

      bookItems.forEach(item => {
        if (item.asset && !foundAssetIds.has(item.asset.id)) {
          const assetWithBookRoom = {
            ...item.asset,
            currentRoom: item.room,
          };
          results.push(assetWithBookRoom);
          foundAssetIds.add(item.asset.id);
        }
      });
    }

    return results.slice(0, 5);
  }

  private extractSearchTerms(query: string): string[] {
    const cleanQuery = query
      .toLowerCase()
      .replace(/(ở đâu|nằm ở đâu|vị trí|tìm|kiếm|có|là|được|của|trong|tài sản|thiết bị)/g, '')
      .trim();

    const terms = cleanQuery
      .split(/\s+/)
      .filter((term) => term.length >= 2)
      .slice(0, 5);

    if (terms.length === 0) {
      const codePattern = /[A-Z0-9]{3,}/gi;
      const codes = query.match(codePattern);
      if (codes && codes.length > 0) {
        return codes.slice(0, 5);
      }
    }

    return terms;
  }

  private buildSystemPrompt(contextData: any): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    
    let prompt = `Trợ lý AI quản lý tài sản. Trả lời ngắn gọn, chính xác bằng tiếng Việt, dùng Markdown.
Quy tắc: **bold** cho số liệu, bullet (-) cho danh sách, \`code\` cho mã, table khi cần.
Khi trả lời về vị trí tài sản, luôn thêm link markdown [Xem chi tiết](URL) từ dữ liệu để người dùng click.

`;

    if (Object.keys(contextData).length > 0) {
      prompt += 'Dữ liệu:\n';

      if (contextData.totalAssets !== undefined) {
        prompt += `Tổng: ${contextData.totalAssets}\n`;
      }

      const MAX_ITEMS = 10;

      if (contextData.assetsByUnit && contextData.assetsByUnit.length > 0) {
        prompt += 'Đơn vị: ';
        contextData.assetsByUnit.slice(0, MAX_ITEMS).forEach((item: any, idx: number) => {
          prompt += `${item.unitName || 'N/A'}:${item.assetCount}${idx < Math.min(contextData.assetsByUnit.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.assetsByCategory && contextData.assetsByCategory.length > 0) {
        prompt += 'Danh mục: ';
        contextData.assetsByCategory.slice(0, MAX_ITEMS).forEach((item: any, idx: number) => {
          prompt += `${item.categoryName}:${item.assetCount}${idx < Math.min(contextData.assetsByCategory.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.assetsByStatus && contextData.assetsByStatus.length > 0) {
        prompt += 'Trạng thái: ';
        contextData.assetsByStatus.slice(0, MAX_ITEMS).forEach((item: any, idx: number) => {
          prompt += `${item.status}:${item.assetCount}${idx < Math.min(contextData.assetsByStatus.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.assetLocations && contextData.assetLocations.length > 0) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
        prompt += 'Vị trí:\n';
        contextData.assetLocations.slice(0, 5).forEach((asset: any) => {
          const assetLink = frontendUrl ? `${frontendUrl}/asset/${asset.id}` : '';
          if (asset.currentRoom) {
            prompt += `- ${asset.name} (\`${asset.ktCode}\`): ${asset.currentRoom.name} (\`${asset.currentRoom.roomCode}\`), ${asset.currentRoom.building} T${asset.currentRoom.floor}${assetLink ? ` [Chi tiết](${assetLink})` : ''}\n`;
          } else {
            prompt += `- ${asset.name} (\`${asset.ktCode}\`): Chưa phân bổ${assetLink ? ` [Chi tiết](${assetLink})` : ''}\n`;
          }
        });
      }

      if (contextData.units && contextData.units.length > 0) {
        prompt += 'Đơn vị: ';
        contextData.units.slice(0, MAX_ITEMS).forEach((unit: any, idx: number) => {
          prompt += `${unit.name}(${unit.unitCode})${idx < Math.min(contextData.units.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.rooms && contextData.rooms.length > 0) {
        prompt += 'Phòng: ';
        contextData.rooms.slice(0, MAX_ITEMS).forEach((room: any, idx: number) => {
          prompt += `${room.name}(${room.roomCode})${idx < Math.min(contextData.rooms.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.categories && contextData.categories.length > 0) {
        prompt += 'Danh mục: ';
        contextData.categories.slice(0, MAX_ITEMS).forEach((category: any, idx: number) => {
          prompt += `${category.name}(${category.code})${idx < Math.min(contextData.categories.length, MAX_ITEMS) - 1 ? ', ' : ''}`;
        });
        prompt += '\n';
      }

      if (contextData.assetsInRoom) {
        const roomData = contextData.assetsInRoom;
        if (roomData.room) {
          prompt += `Phòng \`${roomData.room.roomCode}\`: ${roomData.room.name}, ${roomData.room.building} T${roomData.room.floor}, ${roomData.totalAssets} tài sản\n`;
          if (roomData.totalAssets > 0) {
            const categories = Object.entries(roomData.assetsByCategory).slice(0, 5);
            categories.forEach(([category, assets]: [string, any]) => {
              prompt += `  ${category}: ${assets.length}`;
              if (assets.length <= 3) {
                assets.forEach((asset: any) => {
                  prompt += ` (${asset.name} \`${asset.ktCode}\`)`;
                });
              }
              prompt += '\n';
            });
          }
        } else {
          prompt += 'Không tìm thấy phòng.\n';
        }
      }
    }

    return prompt;
  }
}

