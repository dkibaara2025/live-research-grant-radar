type LogFields = Record<string, string | number | boolean | null | undefined>;

export function logInfo(event: string, fields: LogFields = {}) {
  writeLog("info", event, fields);
}

export function logWarn(event: string, fields: LogFields = {}) {
  writeLog("warn", event, fields);
}

function writeLog(level: "info" | "warn", event: string, fields: LogFields) {
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  console.log(
    JSON.stringify({
      level,
      event,
      time: new Date().toISOString(),
      ...safeFields,
    }),
  );
}
