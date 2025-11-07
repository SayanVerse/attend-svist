import { useEffect } from "react";
import { toast } from "sonner";

export function useNotifications() {
  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const scheduleAttendanceReminder = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      // Check if it's a weekday and time is between 9 AM - 11 AM
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      // Only on weekdays (Monday-Friday)
      if (day >= 1 && day <= 5 && hour >= 9 && hour < 11) {
        new Notification("AttendPro Reminder", {
          body: "Don't forget to mark today's attendance!",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "attendance-reminder",
          requireInteraction: false,
        });
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Notifications enabled!");
        scheduleAttendanceReminder();
      } else if (permission === "denied") {
        toast.error("Notification permission denied");
      }
    } else {
      toast.error("Notifications not supported in this browser");
    }
  };

  // Set up daily reminder check
  useEffect(() => {
    const checkAndNotify = () => {
      scheduleAttendanceReminder();
    };

    // Check every hour
    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);
    
    // Check immediately on mount
    checkAndNotify();

    return () => clearInterval(interval);
  }, []);

  return { requestNotificationPermission };
}
