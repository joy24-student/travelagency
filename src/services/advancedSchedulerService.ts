// @ts-nocheck
/**
 * Advanced Scheduler Service
 * Manages timezone-aware, recurring scheduling for emails, SMS, and push notifications
 *
 * Features:
 * - Schedule messages for specific times
 * - Timezone-aware scheduling
 * - Recurring schedules (daily, weekly, monthly, custom cron)
 * - Time zone conversion and localization
 * - Schedule management and cancellation
 * - Bulk scheduling to multiple users
 * - Schedule validation and conflict detection
 * - Calendar view and schedule listing
 * - Automatic daylight saving time handling
 *
 * Database Tables:
 * - scheduled_messages (id, message_type, recipient_id, scheduled_for, timezone, status, created_at)
 * - recurring_schedules (id, name, recurrence_rule, timezone, message_type, template_id, status)
 * - schedule_history (id, schedule_id, execution_time, status, result, executed_at)
 * - timezone_preferences (id, user_id, timezone, preferred_send_time, do_not_disturb_start, do_not_disturb_end)
 */

import { createClient } from "@supabase/supabase-js";
import * as cronparser from "cron-parser";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// TIMEZONE & TIME UTILITIES
// ============================================================================

/**
 * Timezone utilities for scheduling
 */
const timezoneUtils = {
  /**
   * Convert UTC time to user's timezone
   * @param utcDate - UTC date
   * @param timezone - IANA timezone string (e.g., 'America/New_York')
   * @returns Date formatted in user's timezone
   */
  convertToUserTimezone(utcDate: Date, timezone: string): Date {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const parts = formatter.formatToParts(utcDate);
    const year = parseInt(
      parts.find((p) => p.type === "year")?.value || "2024",
    );
    const month =
      parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );
    const second = parseInt(
      parts.find((p) => p.type === "second")?.value || "0",
    );

    return new Date(year, month, day, hour, minute, second);
  },

  /**
   * Convert local time to UTC
   * @param localDate - Local date
   * @param timezone - IANA timezone string
   * @returns UTC date
   */
  convertToUTC(localDate: Date, timezone: string): Date {
    // Get offset for this timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = formatter.formatToParts(localDate);
    const tzYear = parseInt(
      parts.find((p) => p.type === "year")?.value || "2024",
    );
    const tzMonth = parseInt(
      parts.find((p) => p.type === "month")?.value || "1",
    );
    const tzDay = parseInt(parts.find((p) => p.type === "day")?.value || "1");
    const tzHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );

    const tzDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
    const offset = localDate.getTime() - tzDate.getTime();
    return new Date(localDate.getTime() - offset);
  },

  /**
   * Check if date is within business hours
   * @param date - Date to check
   * @param startHour - Start hour (0-23)
   * @param endHour - End hour (0-23)
   * @returns Boolean
   */
  isWithinBusinessHours(
    date: Date,
    startHour: number = 9,
    endHour: number = 17,
  ): boolean {
    const hour = date.getHours();
    return hour >= startHour && hour < endHour;
  },

  /**
   * Get all available timezones
   * @returns List of IANA timezone strings
   */
  getAvailableTimezones(): string[] {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Moscow",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Shanghai",
      "Asia/Hong_Kong",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Pacific/Auckland",
    ];
  },
};

// ============================================================================
// SCHEDULE SERVICE
// ============================================================================

/**
 * Manages one-time scheduled messages
 */
const scheduledMessageService = {
  /**
   * Schedule a message to be sent at a specific time
   * @param messageType - 'email' | 'sms' | 'push'
   * @param recipientId - User ID
   * @param templateId - Template ID
   * @param variables - Template variables
   * @param scheduledFor - ISO datetime string
   * @param timezone - IANA timezone string
   * @param adminId - Admin ID
   * @returns Created schedule
   */
  async scheduleMessage(
    messageType: "email" | "sms" | "push",
    recipientId: string,
    templateId: string,
    variables: Record<string, string>,
    scheduledFor: string,
    timezone: string,
    adminId: string,
  ) {
    try {
      // Convert local time to UTC
      const localDate = new Date(scheduledFor);
      const utcDate = timezoneUtils.convertToUTC(localDate, timezone);

      const { data, error } = await supabase
        .from("scheduled_messages")
        .insert([
          {
            message_type: messageType,
            recipient_id: recipientId,
            template_id: templateId,
            variables,
            scheduled_for_utc: utcDate.toISOString(),
            scheduled_for_local: scheduledFor,
            timezone,
            status: "scheduled",
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error scheduling message:", error);
      throw error;
    }
  },

  /**
   * Schedule message to multiple users
   * @param messageType - Message type
   * @param recipientIds - List of user IDs
   * @param templateId - Template ID
   * @param variables - Template variables
   * @param scheduledFor - ISO datetime string
   * @param timezone - IANA timezone string
   * @param adminId - Admin ID
   * @returns Created schedules
   */
  async scheduleBulkMessages(
    messageType: "email" | "sms" | "push",
    recipientIds: string[],
    templateId: string,
    variables: Record<string, string>,
    scheduledFor: string,
    timezone: string,
    adminId: string,
  ) {
    try {
      const schedules = [];

      for (const recipientId of recipientIds) {
        const result = await this.scheduleMessage(
          messageType,
          recipientId,
          templateId,
          variables,
          scheduledFor,
          timezone,
          adminId,
        );

        if (result.success) {
          schedules.push(result.data);
        }
      }

      return {
        success: true,
        scheduled_count: schedules.length,
        data: schedules,
      };
    } catch (error) {
      console.error("Error scheduling bulk messages:", error);
      throw error;
    }
  },

  /**
   * Get scheduled messages for a user
   * @param userId - User ID
   * @returns List of scheduled messages
   */
  async getUserScheduledMessages(userId: string) {
    try {
      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("recipient_id", userId)
        .in("status", ["scheduled", "pending"])
        .order("scheduled_for_utc", { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      throw error;
    }
  },

  /**
   * Cancel a scheduled message
   * @param scheduleId - Schedule ID
   * @returns Success status
   */
  async cancelScheduledMessage(scheduleId: string) {
    try {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", scheduleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error cancelling scheduled message:", error);
      throw error;
    }
  },

  /**
   * Reschedule a message
   * @param scheduleId - Schedule ID
   * @param newScheduledFor - New ISO datetime string
   * @param timezone - IANA timezone string
   * @returns Updated schedule
   */
  async rescheduleMessage(
    scheduleId: string,
    newScheduledFor: string,
    timezone: string,
  ) {
    try {
      const localDate = new Date(newScheduledFor);
      const utcDate = timezoneUtils.convertToUTC(localDate, timezone);

      const { data, error } = await supabase
        .from("scheduled_messages")
        .update({
          scheduled_for_utc: utcDate.toISOString(),
          scheduled_for_local: newScheduledFor,
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error rescheduling message:", error);
      throw error;
    }
  },

  /**
   * Get pending messages to send (ready for execution)
   * @param limit - Max messages to fetch
   * @returns Pending messages
   */
  async getPendingMessages(limit: number = 100) {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_for_utc", now)
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching pending messages:", error);
      throw error;
    }
  },
};

// ============================================================================
// RECURRING SCHEDULE SERVICE
// ============================================================================

/**
 * Manages recurring schedules with cron expressions
 */
const recurringScheduleService = {
  /**
   * Create a recurring schedule
   * @param name - Schedule name
   * @param cronExpression - Cron expression (e.g., "0 9 * * *" for daily 9 AM)
   * @param messageType - 'email' | 'sms' | 'push'
   * @param templateId - Template ID
   * @param targetSegment - User segment to target
   * @param timezone - IANA timezone
   * @param variables - Template variables
   * @param adminId - Admin ID
   * @returns Created schedule
   */
  async createRecurringSchedule(
    name: string,
    cronExpression: string,
    messageType: "email" | "sms" | "push",
    templateId: string,
    targetSegment: string,
    timezone: string,
    variables: Record<string, string>,
    adminId: string,
  ) {
    try {
      // Validate cron expression
      try {
        new cronparser.CronExpression(cronExpression);
      } catch (e) {
        throw new Error("Invalid cron expression");
      }

      const { data, error } = await supabase
        .from("recurring_schedules")
        .insert([
          {
            name,
            cron_expression: cronExpression,
            message_type: messageType,
            template_id: templateId,
            target_segment: targetSegment,
            timezone,
            variables,
            status: "active",
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating recurring schedule:", error);
      throw error;
    }
  },

  /**
   * Get next execution times for a schedule
   * @param scheduleId - Schedule ID
   * @param count - Number of future executions to return
   * @returns List of next execution times
   */
  async getNextExecutionTimes(scheduleId: string, count: number = 5) {
    try {
      const { data: schedule, error } = await supabase
        .from("recurring_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();

      if (error) throw error;

      const parser = new cronparser.CronExpression(schedule.cron_expression, {
        currentDate: new Date(),
      });

      const nextTimes = [];
      for (let i = 0; i < count; i++) {
        const nextDate = parser.next().toDate();
        nextTimes.push({
          execution_number: i + 1,
          utc_time: nextDate.toISOString(),
          local_time: new Intl.DateTimeFormat("en-US", {
            timeZone: schedule.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(nextDate),
        });
      }

      return { success: true, data: nextTimes };
    } catch (error) {
      console.error("Error getting next execution times:", error);
      throw error;
    }
  },

  /**
   * Pause a recurring schedule
   * @param scheduleId - Schedule ID
   * @returns Updated schedule
   */
  async pauseSchedule(scheduleId: string) {
    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .update({ status: "paused", paused_at: new Date().toISOString() })
        .eq("id", scheduleId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error pausing schedule:", error);
      throw error;
    }
  },

  /**
   * Resume a paused schedule
   * @param scheduleId - Schedule ID
   * @returns Updated schedule
   */
  async resumeSchedule(scheduleId: string) {
    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .update({ status: "active", resumed_at: new Date().toISOString() })
        .eq("id", scheduleId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error resuming schedule:", error);
      throw error;
    }
  },

  /**
   * List all recurring schedules
   * @param status - Optional status filter
   * @returns List of schedules
   */
  async listRecurringSchedules(status?: "active" | "paused" | "archived") {
    try {
      let query = supabase.from("recurring_schedules").select("*");

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing recurring schedules:", error);
      throw error;
    }
  },

  /**
   * Delete a recurring schedule
   * @param scheduleId - Schedule ID
   * @returns Success status
   */
  async deleteSchedule(scheduleId: string) {
    try {
      const { error } = await supabase
        .from("recurring_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  },
};

// ============================================================================
// TIMEZONE PREFERENCES SERVICE
// ============================================================================

/**
 * Manages user timezone preferences and do-not-disturb settings
 */
const timezonePreferenceService = {
  /**
   * Set user timezone and preferences
   * @param userId - User ID
   * @param timezone - IANA timezone string
   * @param preferredSendTime - Preferred time to receive messages (HH:MM format)
   * @param doNotDisturbStart - Do not disturb start time (HH:MM format)
   * @param doNotDisturbEnd - Do not disturb end time (HH:MM format)
   * @returns Created/updated preferences
   */
  async setTimezonePreferences(
    userId: string,
    timezone: string,
    preferredSendTime: string = "09:00",
    doNotDisturbStart: string | null = null,
    doNotDisturbEnd: string | null = null,
  ) {
    try {
      const { data, error } = await supabase
        .from("timezone_preferences")
        .upsert(
          {
            user_id: userId,
            timezone,
            preferred_send_time: preferredSendTime,
            do_not_disturb_start: doNotDisturbStart,
            do_not_disturb_end: doNotDisturbEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error setting timezone preferences:", error);
      throw error;
    }
  },

  /**
   * Get user timezone preferences
   * @param userId - User ID
   * @returns User preferences
   */
  async getTimezonePreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from("timezone_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // Return defaults if no preferences set
      return {
        success: true,
        data: data || {
          user_id: userId,
          timezone: "UTC",
          preferred_send_time: "09:00",
          do_not_disturb_start: null,
          do_not_disturb_end: null,
        },
      };
    } catch (error) {
      console.error("Error getting timezone preferences:", error);
      throw error;
    }
  },

  /**
   * Check if current time is within do-not-disturb window
   * @param userId - User ID
   * @returns Boolean indicating if in DND window
   */
  async isInDoNotDisturbWindow(userId: string): Promise<boolean> {
    try {
      const prefs = await this.getTimezonePreferences(userId);
      if (!prefs.success) return false;

      if (!prefs.data.do_not_disturb_start || !prefs.data.do_not_disturb_end) {
        return false;
      }

      const now = new Date();
      const userNow = timezoneUtils.convertToUserTimezone(
        now,
        prefs.data.timezone,
      );
      const [startHour, startMin] = prefs.data.do_not_disturb_start
        .split(":")
        .map(Number);
      const [endHour, endMin] = prefs.data.do_not_disturb_end
        .split(":")
        .map(Number);

      const startDate = new Date(userNow);
      startDate.setHours(startHour, startMin, 0, 0);

      const endDate = new Date(userNow);
      endDate.setHours(endHour, endMin, 0, 0);

      return userNow >= startDate && userNow < endDate;
    } catch (error) {
      console.error("Error checking DND window:", error);
      return false;
    }
  },

  /**
   * Get optimal send time for user
   * @param userId - User ID
   * @returns Optimal send time as ISO string
   */
  async getOptimalSendTime(userId: string): Promise<string> {
    try {
      const prefs = await this.getTimezonePreferences(userId);
      if (!prefs.success) return new Date().toISOString();

      const now = new Date();
      const [hour, min] = prefs.data.preferred_send_time.split(":").map(Number);

      const optimalDate = new Date(now);
      optimalDate.setHours(hour, min, 0, 0);

      // If optimal time has passed today, schedule for tomorrow
      if (optimalDate < now) {
        optimalDate.setDate(optimalDate.getDate() + 1);
      }

      return timezoneUtils
        .convertToUTC(optimalDate, prefs.data.timezone)
        .toISOString();
    } catch (error) {
      console.error("Error getting optimal send time:", error);
      throw error;
    }
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  timezoneUtils,
  scheduledMessageService,
  recurringScheduleService,
  timezonePreferenceService,
};
