class Log {
	static getTimeStamp() {
		return new Date().toISOString();
	}

	static info(message) {
		console.log(`\x1b[34m[INFO] [${this.getTimeStamp()}] ${message}\x1b[0m`);
	}

	static warn(message) {
		console.warn(`\x1b[33m[WARN] [${this.getTimeStamp()}] ${message}\x1b[0m`);
	}

	static error(message) {
		console.error(`\x1b[31m[ERROR] [${this.getTimeStamp()}] ${message}\x1b[0m`);
	}

	static progress(current, total, message = '') {
		const percent = Math.round((current / total) * 100);
		console.log(`\x1b[36m[PROGRESS] [${this.getTimeStamp()}] ${percent}% (${current}/${total}) ${message}\x1b[0m`);
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
}

module.exports = Log;
