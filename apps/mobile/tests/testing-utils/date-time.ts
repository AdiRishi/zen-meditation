const WALL_CLOCK_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function expectedWallClockTime(hour: number, minute: number) {
  return WALL_CLOCK_TIME_FORMATTER.format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}
