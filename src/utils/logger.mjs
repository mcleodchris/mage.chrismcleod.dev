import { createLogger, format, transports } from "winston";

const { combine, colorize, timestamp, errors, splat, printf } = format;

/**
 * Serializes a value (usually an Error) for inclusion in a log message.
 * Prefer this over passing an Error as winston's meta argument: winston merges
 * meta onto the log record, and an Error's `message` silently overwrites the
 * message you actually wrote.
 * Errors get name/message/stack plus any enumerable extras (OpenAI SDK errors
 * carry status/code/type/error on the instance, which JSON.stringify drops).
 */
export function describeError(value) {
    if (value instanceof Error) {
        const extras = {};
        for (const key of Object.keys(value)) {
            if (key !== "message" && key !== "stack") extras[key] = value[key];
        }
        const detail = Object.keys(extras).length ? ` ${safeJson(extras)}` : "";
        return `${value.name}: ${value.message}${detail}\n${value.stack}`;
    }
    if (typeof value === "string") return value;
    return safeJson(value);
}

function safeJson(value) {
    try {
        return JSON.stringify(value);
    } catch {
        // Circular references are common on HTTP/socket objects.
        return String(value);
    }
}

/**
 * Creates a logger instance using the winston library.
 * @returns {import("winston").Logger} The logger instance.
 */
export function logger() {
    return createLogger({
        format: combine(
            errors({ stack: true }),
            splat(),
            colorize({ all: true }),
            timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
            printf((info) => {
                const parts = [`[${info.timestamp}] ${info.level}: ${info.message}`];
                // Extra args land in SPLAT; without this they are dropped entirely.
                const extra = info[Symbol.for("splat")] ?? [];
                for (const arg of extra) parts.push(describeError(arg));
                // Only surface info.stack when the Error was the message itself;
                // otherwise splat already rendered it above.
                if (info.stack && !extra.some((arg) => arg instanceof Error)) {
                    parts.push(info.stack);
                }
                return parts.join(" ");
            }),
        ),
        transports: new transports.Console(),
        level: process.env.LOG_LEVEL ?? "debug",
    });
}

const log = logger();
export default log;
