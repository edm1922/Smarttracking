import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    setInterval(async () => {
      try {
        await this.cleanupOldMessages();
      } catch (error) {
        console.error('Chat cleanup error:', error);
      }
    }, 60 * 60 * 1000);
  }

  async cleanupOldMessages() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.prisma.chatMessage.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        messages: { none: {} },
      },
    });

    for (const conv of conversations) {
      await this.prisma.chatConversation.delete({
        where: { id: conv.id },
      });
    }
  }

  async getConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: {
        OR: [
          { participant1: userId },
          { participant2: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    const sortedIds = [userId, otherUserId].sort();
    
    let conversation = await this.prisma.chatConversation.findFirst({
      where: {
        OR: [
          { participant1: sortedIds[0], participant2: sortedIds[1] },
          { participant1: sortedIds[1], participant2: sortedIds[0] },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          participant1: sortedIds[0],
          participant2: sortedIds[1],
        },
      });
    }

    return conversation;
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1: userId },
          { participant2: userId },
        ],
      },
    });

    if (!conversation) {
      return [];
    }

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    const conversation = await this.getOrCreateConversation(senderId, receiverId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        updatedAt: new Date(),
      },
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1: userId },
          { participant2: userId },
        ],
      },
    });

    if (!conversation) {
      return;
    }

    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCount(conversationId: string, userId: string) {
    return this.prisma.chatMessage.count({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
    });
  }

  async getAllUnreadCounts(userId: string) {
    const conversations = await this.getConversations(userId);
    const counts: Record<string, number> = {};

    for (const conv of conversations) {
      counts[conv.id] = await this.getUnreadCount(conv.id, userId);
    }

    return counts;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        senderId: userId,
      },
    });

    if (!message) {
      return;
    }

    await this.prisma.chatMessage.delete({
      where: { id: messageId },
    });

    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: message.conversationId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (conversation && conversation.messages.length > 0) {
      await this.prisma.chatConversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessage: conversation.messages[0].content,
        },
      });
    }
  }
}