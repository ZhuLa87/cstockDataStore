require("dotenv").config();

// 日誌級別定義
const LogLevels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    WTF: 4,
    NONE: 5,
};

class Log {
    static get logLevel() {
        // 從環境變數獲取日誌級別，預設為 INFO
        const configLevel = (process.env.LOG_LEVEL || "INFO").toUpperCase();
        return LogLevels[configLevel] !== undefined
            ? LogLevels[configLevel]
            : LogLevels.INFO;
    }

    static getTimeStamp() {
        return new Date().toISOString();
    }

    static debug(message) {
        if (this.logLevel <= LogLevels.DEBUG) {
            console.log(
                `\x1b[32m[DEBUG] [${this.getTimeStamp()}] ${message}\x1b[0m`
            );
        }
    }

    static info(message) {
        if (this.logLevel <= LogLevels.INFO) {
            console.log(
                `\x1b[34m[INFO] [${this.getTimeStamp()}] ${message}\x1b[0m`
            );
        }
    }

    static warn(message) {
        if (this.logLevel <= LogLevels.WARN) {
            console.warn(
                `\x1b[33m[WARN] [${this.getTimeStamp()}] ${message}\x1b[0m`
            );
        }
    }

    static error(message) {
        if (this.logLevel <= LogLevels.ERROR) {
            console.error(
                `\x1b[31m[ERROR] [${this.getTimeStamp()}] ${message}\x1b[0m`
            );
        }
    }

    static wtf(message) {
        if (this.logLevel <= LogLevels.WTF) {
            console.log(
                `\x1b[35m[WTF] [${this.getTimeStamp()}] ${message}\x1b[0m`
            );
        }
    }

    static timer(label) {
        if (!this.timers) this.timers = {};

        if (this.timers[label]) {
            const elapsed = Date.now() - this.timers[label];
            delete this.timers[label];
            return elapsed;
        } else {
            this.timers[label] = Date.now();
            return null;
        }
    }

    // 顯示目前的日誌級別
    static showLogLevel() {
        const levelName =
            Object.keys(LogLevels).find(
                (key) => LogLevels[key] === this.logLevel
            ) || "UNKNOWN";
        console.log(
            `\x1b[35m[SYSTEM] [${this.getTimeStamp()}] 當前日誌級別: ${levelName}\x1b[0m`
        );
    }
}

module.exports = Log;
