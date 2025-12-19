import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto, ChatResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Chat với AI về tài sản',
    description: 'Gửi câu hỏi và nhận câu trả lời từ AI về vị trí tài sản, thống kê, v.v.'
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về câu trả lời từ AI',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ',
  })
  @ApiResponse({
    status: 503,
    description: 'Service Unavailable - OpenAI API không khả dụng',
  })
  async chat(
    @Body() chatMessageDto: ChatMessageDto,
    @CurrentUser() user: any,
  ): Promise<ChatResponseDto> {
    return await this.chatbotService.chat(chatMessageDto, user.id);
  }
}

