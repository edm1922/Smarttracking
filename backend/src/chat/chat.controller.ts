import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:conversationId')
  async getMessages(@Param('conversationId') conversationId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getMessages(conversationId, userId);
  }

  @Post('messages')
  async sendMessage(@Body() body: { receiverId: string; content: string }, @Req() req: any) {
    const senderId = req.user.sub;
    const { receiverId, content } = body;
    return this.chatService.sendMessage(senderId, receiverId, content);
  }

  @Patch('messages/:conversationId/read')
  async markAsRead(@Param('conversationId') conversationId: string, @Req() req: any) {
    const userId = req.user.sub;
    await this.chatService.markAsRead(conversationId, userId);
    return { success: true };
  }

  @Get('unread')
  async getUnreadCounts(@Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getAllUnreadCounts(userId);
  }

  @Get('conversation/:otherUserId')
  async getOrCreateConversation(@Param('otherUserId') otherUserId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getOrCreateConversation(userId, otherUserId);
  }

  @Post('cleanup')
  async cleanup() {
    await this.chatService.cleanupOldMessages();
    return { success: true };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Param('messageId') messageId: string, @Req() req: any) {
    const userId = req.user.sub;
    await this.chatService.deleteMessage(messageId, userId);
    return { success: true };
  }
}