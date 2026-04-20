import api from "./axios";
import type { ApiResponse } from "./apiTypes";
import { unwrapAxiosApiData, unwrapAxiosApiList } from "./apiTypes";

export interface NotificationDto {
  notificationId: number;
  userId: number;
  message: string;
  category: string;
  status: string;
  createdDate: string;
}

export async function fetchNotifications(): Promise<NotificationDto[]> {
  const res = await api.get<ApiResponse<unknown>>("/notifications");
  return unwrapAxiosApiList<NotificationDto>(res);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await api.get<ApiResponse<number>>("/notifications/unread-count");
  return unwrapAxiosApiData(res);
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const res = await api.patch<ApiResponse<object>>(`/notifications/${notificationId}/read`);
  unwrapAxiosApiData(res);
}

export async function dismissNotification(notificationId: number): Promise<void> {
  const res = await api.patch<ApiResponse<object>>(`/notifications/${notificationId}/dismiss`);
  unwrapAxiosApiData(res);
}
