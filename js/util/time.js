import {
  SEC_PER_MIN, SEC_PER_HOUR, SEC_PER_DAY, SEC_PER_WEEK, SEC_PER_MONTH, SEC_PER_YEAR
} from "../config.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UNITS = [
  [SEC_PER_YEAR, "y"], [SEC_PER_MONTH, "mo"], [SEC_PER_WEEK, "w"],
  [SEC_PER_DAY, "d"], [SEC_PER_HOUR, "h"], [SEC_PER_MIN, "m"]
];

const pad2 = (n) => String(n).padStart(2, "0");

export class Time {
  static relative(unix) {
    if (!unix) return "";
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - unix);
    for (const [size, label] of UNITS) {
      if (diff >= size) return `${Math.floor(diff / size)}${label} ago`;
    }
    return "just now";
  }

  static parts(unix) {
    const d = new Date(unix * 1000);
    return {
      day: pad2(d.getDate()),
      month: MONTHS[d.getMonth()],
      weekday: WEEKDAYS[d.getDay()],
      time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
      iso: d.toISOString(),
      full: d.toLocaleString()
    };
  }
}
