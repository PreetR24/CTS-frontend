import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  dismissNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  type NotificationDto,
} from "../../../api/notificationsApi";

type TaskRow = {
  id: number;
  title: string;
  description: string;
  priority: "High" | "Normal";
  status: "Pending" | "Completed";
};

export default function StaffTasks() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, unread] = await Promise.all([
          fetchNotifications(),
          fetchUnreadNotificationCount(),
        ]);
        if (!cancelled) {
          setNotifications(list);
          setUnreadCount(unread);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tasks: TaskRow[] = notifications.map((n) => ({
    id: n.notificationId,
    title: n.category || "Task",
    description: n.message,
    priority: /urgent|critical|high/i.test(n.message) ? "High" : "Normal",
    status: n.status.toLowerCase() === "unread" ? "Pending" : "Completed",
  }));

  const markDone = async (taskId: number) => {
    try {
      await markNotificationAsRead(taskId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === taskId ? { ...n, status: "Read" } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // keep original task state if API call fails
    }
  };

  const dismissTask = async (taskId: number) => {
    try {
      await dismissNotification(taskId);
      setNotifications((prev) => prev.filter((n) => n.notificationId !== taskId));
    } catch {
      // keep original list if API call fails
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily tasks and responsibilities ({unreadCount} unread)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                task.priority === "High" ? "bg-[#eb9d9d]/30 text-foreground" : "bg-[#7ba3c0]/20 text-foreground"
              }`}>
                {task.priority}
              </span>
            </div>
            <button
              onClick={() => markDone(task.id)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              task.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            >
              <CheckCircle className="w-4 h-4" />
              {task.status === "Completed" ? "Completed" : "Mark Complete"}
            </button>
            <button
              onClick={() => dismissTask(task.id)}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
