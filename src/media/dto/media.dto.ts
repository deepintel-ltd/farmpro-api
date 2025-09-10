import { ActivityNoteType } from '@prisma/client';

export interface CreateActivityNoteDto {
  content: string;
  type?: ActivityNoteType;
  isPrivate?: boolean;
  attachments?: string[];
}

export interface UpdateActivityNoteDto {
  content?: string;
  type?: ActivityNoteType;
  isPrivate?: boolean;
  attachments?: string[];
}

export interface MediaUploadMetadata {
  description?: string;
  tags?: string[];
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
}

export interface ActivityMediaResponse {
  id: string;
  type: 'activity-media';
  attributes: {
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    metadata?: any;
  };
}

export interface ActivityNoteResponse {
  id: string;
  type: 'activity-notes';
  attributes: {
    id: string;
    activityId: string;
    content: string;
    type: ActivityNoteType;
    isPrivate: boolean;
    attachments: string[];
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
  };
}