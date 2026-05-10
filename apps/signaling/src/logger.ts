const isProduction = process.env.NODE_ENV === "production";

type Level = "info" | "warn" | "error";

function log(level: Level, context: string, message: string) {
    if (isProduction) {
        process.stdout.write(JSON.stringify({ level, context, message, ts: new Date().toISOString() }) + "\n");
    } else {
        const prefix = `[${context}]`;
        if (level === "error") {
            console.error(`${prefix} ${message}`);
        } else if (level === "warn") {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}

export function createLogger(context: string) {
    return {
        info: (msg: string) => log("info", context, msg),
        warn: (msg: string) => log("warn", context, msg),
        error: (msg: string) => log("error", context, msg),
    };
}
