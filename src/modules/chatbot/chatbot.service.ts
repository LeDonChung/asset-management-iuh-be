import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../../entities/asset.entity';
import { Unit } from '../../entities/unit.entity';
import { Room } from '../../entities/room.entity';
import { Category } from '../../entities/category.entity';
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
    private openAIService: OpenAIService,
  ) {}

  async chat(chatMessageDto: ChatMessageDto, userId: string): Promise<ChatResponseDto> {
    const { message, unitId, conversationHistory = [] } = chatMessageDto;

    this.logger.log(`Processing chat message from user ${userId}: ${message}`);

    try {
      // Get context data based on the question
      const contextData = await this.getContextData(message, unitId);

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(contextData);

      // Build messages for OpenAI
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: message },
      ];

      // Call OpenAI with retry logic
      const { response, retryCount, keyUsed } = await this.openAIService.chat(
        messages,
        0.7,
        1500
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

  /**
   * Get relevant context data based on user query
   */
  private async getContextData(message: string, unitId?: string): Promise<any> {
    const lowerMessage = message.toLowerCase();
    const contextData: any = {};

    try {
      // Check if query is about asset statistics
      if (
        lowerMessage.includes('bao nhiêu') ||
        lowerMessage.includes('thống kê') ||
        lowerMessage.includes('số lượng') ||
        lowerMessage.includes('tổng')
      ) {
        // Get asset count by unit
        if (unitId || lowerMessage.includes('đơn vị')) {
          contextData.assetsByUnit = await this.getAssetsByUnit(unitId);
        } else {
          contextData.totalAssets = await this.assetRepository.count({
            where: { deletedAt: null },
          });
        }

        // Get asset count by category
        contextData.assetsByCategory = await this.getAssetsByCategory(unitId);

        // Get asset count by status
        contextData.assetsByStatus = await this.getAssetsByStatus(unitId);
      }

      // Check if query is about asset location
      if (
        lowerMessage.includes('ở đâu') ||
        lowerMessage.includes('vị trí') ||
        lowerMessage.includes('phòng') ||
        lowerMessage.includes('tìm')
      ) {
        // Try to find asset by code or name
        contextData.assetLocations = await this.findAssetLocations(message, unitId);
      }

      // Check if query is about units
      if (lowerMessage.includes('đơn vị')) {
        contextData.units = await this.unitRepository.find({
          where: { deletedAt: null },
          select: ['id', 'name', 'unitCode', 'type', 'status'],
        });
      }

      // Check if query is about rooms
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

      // Check if query is about categories
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

  /**
   * Get assets grouped by unit
   */
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

  /**
   * Get assets grouped by category
   */
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

  /**
   * Get assets grouped by status
   */
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

    // Group assets by category
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

  /**
   * Find asset locations based on query
   */
  private async findAssetLocations(query: string, unitId?: string): Promise<any[]> {
    // Extract potential asset codes or names from query
    const searchTerms = this.extractSearchTerms(query);

    if (searchTerms.length === 0) {
      return [];
    }

    const qb = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.currentRoom', 'room')
      .leftJoinAndSelect('room.unit', 'unit')
      .leftJoinAndSelect('asset.category', 'category')
      .where('asset.deletedAt IS NULL');

    // Build search conditions
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

    qb.take(10); // Limit results

    return await qb.getMany();
  }

  /**
   * Extract search terms from query
   */
  private extractSearchTerms(query: string): string[] {
    // Remove common Vietnamese question words
    const cleanQuery = query
      .toLowerCase()
      .replace(/(ở đâu|vị trí|tìm|kiếm|có|là|được|của|trong)/g, '')
      .trim();

    // Split by spaces and filter out short terms
    return cleanQuery
      .split(/\s+/)
      .filter((term) => term.length >= 2)
      .slice(0, 5); // Max 5 search terms
  }

  /**
   * Build system prompt with context data
   */
  private buildSystemPrompt(contextData: any): string {
    let prompt = `Bạn là một trợ lý AI thông minh cho hệ thống quản lý tài sản. 
Nhiệm vụ của bạn là trả lời các câu hỏi về tài sản, vị trí, thống kê dựa trên dữ liệu được cung cấp.

Quy tắc:
1. Trả lời ngắn gọn, rõ ràng, chính xác bằng tiếng Việt
2. Sử dụng dữ liệu được cung cấp để trả lời
3. Nếu không có đủ thông tin, hãy nói rõ và gợi ý cách tìm kiếm khác
4. **QUAN TRỌNG: Trả lời theo định dạng Markdown để hiển thị đẹp:**
   - Sử dụng **bold** cho tiêu đề và số liệu quan trọng
   - Sử dụng bullet points (-, *) cho danh sách
   - Sử dụng heading (##, ###) cho các phần
   - Sử dụng code block (\`\`\`) cho mã tài sản
   - Sử dụng table khi cần so sánh nhiều dữ liệu
   - Sử dụng > cho ghi chú quan trọng
5. Luôn lịch sự và hữu ích

`;

    // Add context data to prompt
    if (Object.keys(contextData).length > 0) {
      prompt += '\nDữ liệu hiện có:\n';

      if (contextData.totalAssets !== undefined) {
        prompt += `- Tổng số tài sản: ${contextData.totalAssets}\n`;
      }

      if (contextData.assetsByUnit && contextData.assetsByUnit.length > 0) {
        prompt += '\n- Tài sản theo đơn vị:\n';
        contextData.assetsByUnit.forEach((item: any) => {
          prompt += `  + **${item.unitName || 'Chưa phân bổ'}**: ${item.assetCount} tài sản\n`;
        });
      }

      if (contextData.assetsByCategory && contextData.assetsByCategory.length > 0) {
        prompt += '\n- Tài sản theo danh mục:\n';
        contextData.assetsByCategory.forEach((item: any) => {
          prompt += `  + **${item.categoryName}**: ${item.assetCount} tài sản\n`;
        });
      }

      if (contextData.assetsByStatus && contextData.assetsByStatus.length > 0) {
        prompt += '\n- Tài sản theo trạng thái:\n';
        contextData.assetsByStatus.forEach((item: any) => {
          prompt += `  + **${item.status}**: ${item.assetCount} tài sản\n`;
        });
      }

      if (contextData.assetLocations && contextData.assetLocations.length > 0) {
        prompt += '\n- Vị trí tài sản:\n';
        contextData.assetLocations.forEach((asset: any) => {
          prompt += `  + **${asset.name}** (\`${asset.ktCode}\`):\n`;
          if (asset.currentRoom) {
            prompt += `    - Phòng: **${asset.currentRoom.name}** (\`${asset.currentRoom.roomCode}\`)\n`;
            prompt += `    - Tòa nhà: ${asset.currentRoom.building}, Tầng: ${asset.currentRoom.floor}\n`;
            if (asset.currentRoom.unit) {
              prompt += `    - Đơn vị: ${asset.currentRoom.unit.name}\n`;
            }
          } else {
            prompt += `    - Chưa phân bổ vị trí\n`;
          }
        });
      }

      if (contextData.units && contextData.units.length > 0) {
        prompt += '\n- Danh sách đơn vị:\n';
        contextData.units.forEach((unit: any) => {
          prompt += `  + ${unit.name} (Mã: ${unit.unitCode}) - ${unit.type}\n`;
        });
      }

      if (contextData.rooms && contextData.rooms.length > 0) {
        prompt += '\n- Danh sách phòng:\n';
        contextData.rooms.forEach((room: any) => {
          prompt += `  + ${room.name} (${room.roomCode}) - ${room.building}, Tầng ${room.floor}`;
          if (room.unit) {
            prompt += ` - Đơn vị: ${room.unit.name}`;
          }
          prompt += '\n';
        });
      }

      if (contextData.categories && contextData.categories.length > 0) {
        prompt += '\n- Danh mục tài sản:\n';
        contextData.categories.forEach((category: any) => {
          prompt += `  + ${category.name} (Mã: ${category.code})`;
          if (category.description) {
            prompt += ` - ${category.description}`;
          }
          prompt += '\n';
        });
      }

      if (contextData.assetsInRoom) {
        const roomData = contextData.assetsInRoom;
        if (roomData.room) {
          prompt += `\n- Thông tin phòng \`${roomData.room.roomCode}\`:\n`;
          prompt += `  + Tên phòng: **${roomData.room.name}**\n`;
          prompt += `  + Tòa nhà: ${roomData.room.building}, Tầng: ${roomData.room.floor}\n`;
          if (roomData.room.unit) {
            prompt += `  + Đơn vị: ${roomData.room.unit}\n`;
          }
          prompt += `  + Tổng số tài sản: **${roomData.totalAssets}**\n`;

          if (roomData.totalAssets > 0) {
            prompt += '\n- Tài sản theo danh mục:\n';
            Object.entries(roomData.assetsByCategory).forEach(([category, assets]: [string, any]) => {
              prompt += `  + **${category}**: ${assets.length} tài sản\n`;
              assets.forEach((asset: any) => {
                prompt += `    - ${asset.name} (\`${asset.ktCode}\`) - ${asset.status}\n`;
              });
            });
          }
        } else {
          prompt += '\n- Không tìm thấy phòng với mã được cung cấp.\n';
        }
      }
    }

    return prompt;
  }
}

