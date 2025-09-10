import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityNoteType } from '@prisma/client';

export interface CreateNoteDto {
  content: string;
  type?: ActivityNoteType;
  isPrivate?: boolean;
  attachments?: string[]; // Media file IDs
}

export interface UpdateNoteDto {
  content?: string;
  type?: ActivityNoteType;
  isPrivate?: boolean;
  attachments?: string[];
}

@Injectable()
export class ActivityNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createNote(
    activityId: string,
    noteData: CreateNoteDto,
    userId: string,
    organizationId: string
  ) {
    // Verify activity exists and user has access
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        assignments: {
          where: { isActive: true },
          select: { userId: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to the activity or is the creator
    const isAssigned = activity.assignments.some(a => a.userId === userId);
    const isCreator = activity.createdById === userId;

    if (!isAssigned && !isCreator) {
      throw new ForbiddenException('Not authorized to add notes to this activity');
    }

    // Validate attachments if provided
    if (noteData.attachments?.length) {
      await this.validateAttachments(noteData.attachments, activityId);
    }

    const note = await this.prisma.activityNote.create({
      data: {
        activityId,
        userId,
        content: noteData.content,
        type: noteData.type || ActivityNoteType.GENERAL,
        isPrivate: noteData.isPrivate || false,
        attachments: noteData.attachments || [],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: note.id,
      type: 'activity-notes' as const,
      attributes: {
        id: note.id,
        activityId: note.activityId,
        content: note.content,
        type: note.type,
        isPrivate: note.isPrivate,
        attachments: note.attachments,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        author: note.user,
      },
    };
  }

  async getActivityNotes(
    activityId: string,
    userId: string,
    organizationId: string,
    filters: {
      type?: ActivityNoteType;
      includePrivate?: boolean;
    } = {}
  ) {
    // Verify activity access
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        assignments: {
          where: { isActive: true },
          select: { userId: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check access level
    const isAssigned = activity.assignments.some(a => a.userId === userId);
    const isCreator = activity.createdById === userId;
    const hasAccess = isAssigned || isCreator;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view notes for this activity');
    }

    // Build where clause
    const where: any = { activityId };

    if (filters.type) {
      where.type = filters.type;
    }

    // Handle private notes visibility
    if (!filters.includePrivate) {
      where.OR = [
        { isPrivate: false },
        { userId, isPrivate: true }, // User can see their own private notes
      ];
    }

    const notes = await this.prisma.activityNote.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: notes.map(note => ({
        id: note.id,
        type: 'activity-notes' as const,
        attributes: {
          id: note.id,
          activityId: note.activityId,
          content: note.content,
          type: note.type,
          isPrivate: note.isPrivate,
          attachments: note.attachments,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          author: note.user,
        },
      })),
      meta: {
        totalNotes: notes.length,
        noteTypes: this.countByType(notes),
        privateNotes: notes.filter(n => n.isPrivate).length,
      },
    };
  }

  async updateNote(
    noteId: string,
    updateData: UpdateNoteDto,
    userId: string,
    organizationId: string
  ) {
    const note = await this.prisma.activityNote.findFirst({
      where: {
        id: noteId,
        activity: {
          farm: { organizationId },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Only the author can edit their own notes
    if (note.userId !== userId) {
      throw new ForbiddenException('Can only edit your own notes');
    }

    // Validate attachments if provided
    if (updateData.attachments?.length) {
      await this.validateAttachments(updateData.attachments, note.activityId);
    }

    const updatedNote = await this.prisma.activityNote.update({
      where: { id: noteId },
      data: {
        ...(updateData.content && { content: updateData.content }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.isPrivate !== undefined && { isPrivate: updateData.isPrivate }),
        ...(updateData.attachments && { attachments: updateData.attachments }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: updatedNote.id,
      type: 'activity-notes' as const,
      attributes: {
        id: updatedNote.id,
        activityId: updatedNote.activityId,
        content: updatedNote.content,
        type: updatedNote.type,
        isPrivate: updatedNote.isPrivate,
        attachments: updatedNote.attachments,
        createdAt: updatedNote.createdAt.toISOString(),
        updatedAt: updatedNote.updatedAt.toISOString(),
        author: updatedNote.user,
      },
    };
  }

  async deleteNote(noteId: string, userId: string, organizationId: string) {
    const note = await this.prisma.activityNote.findFirst({
      where: {
        id: noteId,
        activity: {
          farm: { organizationId },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Only the author can delete their own notes
    if (note.userId !== userId) {
      throw new ForbiddenException('Can only delete your own notes');
    }

    await this.prisma.activityNote.delete({
      where: { id: noteId },
    });

    return {
      success: true,
      message: 'Note deleted successfully',
    };
  }

  private async validateAttachments(attachmentIds: string[], activityId: string) {
    const mediaFiles = await this.prisma.media.findMany({
      where: {
        id: { in: attachmentIds },
        farmActivityId: activityId,
      },
    });

    if (mediaFiles.length !== attachmentIds.length) {
      throw new ForbiddenException('One or more attachment files are invalid or not associated with this activity');
    }
  }

  private countByType(notes: any[]): Record<string, number> {
    return notes.reduce((counts, note) => {
      counts[note.type] = (counts[note.type] || 0) + 1;
      return counts;
    }, {});
  }
}