"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(application) {
        this.eventlogs = [];
        this.addEventLog = (group, event, details) => {
            this.eventlogs.push(Date.now() + ", " + group + ", " + event + ", " + details.replace(",", " "));
            if (this.eventlogs.length > this.app.configuration.MAX_EVENTS_IN_LOG) {
                this.eventlogs.shift();
            }
        };
        this.app = application;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map