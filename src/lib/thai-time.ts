/**
 * Utility functions for Thailand timezone (Asia/Bangkok, UTC+7)
 * Ensures all dates, times, and live clocks run synchronously with Thailand time.
 */

import { useState, useEffect } from "react";

const THAI_TIMEZONE = "Asia/Bangkok";

/**
 * Returns the current time formatted in Thailand time zone (HH:mm or HH:mm:ss)
 */
export function getThailandTimeString(includeSeconds = false): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: THAI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (includeSeconds) {
    options.second = "2-digit";
  }
  return new Intl.DateTimeFormat("th-TH", options).format(new Date());
}

/**
 * Returns formatted date string in Thailand time zone (e.g. 8 ต.ค. 2569)
 */
export function getThailandDateString(full = false): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: THAI_TIMEZONE,
    year: "numeric",
    month: full ? "long" : "short",
    day: "numeric",
  };
  return new Intl.DateTimeFormat("th-TH", options).format(new Date());
}

/**
 * Format any timestamp or date into Thailand time string
 */
export function formatToThaiTime(
  dateInput?: Date | string | number,
  includeSeconds = false
): string {
  if (!dateInput) return getThailandTimeString(includeSeconds);
  const dateObj = typeof dateInput === "string" || typeof dateInput === "number"
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(dateObj.getTime())) {
    return String(dateInput);
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: THAI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (includeSeconds) {
    options.second = "2-digit";
  }
  return new Intl.DateTimeFormat("th-TH", options).format(dateObj);
}

/**
 * React hook for a live clock that ticks every second in Thailand Time (Asia/Bangkok)
 * Gives live running time (เวลาเดินแบบ Real-time ตามเวลาประเทศไทย)
 */
export function useThaiLiveClock() {
  const [timeState, setTimeState] = useState(() => ({
    time: getThailandTimeString(true),
    timeShort: getThailandTimeString(false),
    date: getThailandDateString(false),
    dateFull: getThailandDateString(true),
  }));

  useEffect(() => {
    const updateClock = () => {
      setTimeState({
        time: getThailandTimeString(true),
        timeShort: getThailandTimeString(false),
        date: getThailandDateString(false),
        dateFull: getThailandDateString(true),
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeState;
}
