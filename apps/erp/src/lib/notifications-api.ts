// Seluruh akses API notifikasi di satu modul agar mudah disambung ke W1-03.
import { api } from '#lib/api.ts';
import type { components } from '@acme/api-types';

export type AppNotification = components['schemas']['NotificationResponseDto'];

// shortcut: /notifications/unread-count & /read-all belum ada di API (W1-03); bentuk mengikuti SRS FR-NTF-4,
// ketik ulang dari @acme/api-types dan pakai ETag/304 setelah W1-03 rilis. Skema daftar memakai `type`/`isRead`
// versi sekarang (SRS: severity/readAt) — sesuaikan di sini saja.
export const getUnreadCount = () => api<{ count: number }>('/notifications/unread-count');
export const listNotifications = () => api<components['schemas']['NotificationListResponseDto']>('/notifications?perPage=20');
export const markRead = (id: string) => api<void>(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllRead = () => api<void>('/notifications/read-all', { method: 'POST' });
