import { format, createLogger, transports } from "winston";

/**
 * Creates a logger instance using the winston library.
 * @returns {winston.Logger} The logger instance.
 */
export function logger() {
  return createLogger({
    format: format.combine(
      format.colorize({ all: true }),
      format.timestamp({
        format: "YYYY-MM-DD hh:mm:ss.SSS A",
      }),
      format.simple(),
      format.printf(
        (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
      )
    ),
    transports: new transports.Console(),
    level: "debug",
  });
}

const log = logger();
export default log;
