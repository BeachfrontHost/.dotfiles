"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
class Plugin {
    static execute(methodName, ...args) {
        const method = Plugin.methods[methodName];
        return method(...args);
    }
    static getFunction(methodName) {
        return Plugin.methods[methodName];
    }
}
exports.Plugin = Plugin;
_a = Plugin;
Plugin.getList = async () => {
    return ["item 1 | ID: 1", "item 2 | ID: 2", "item 3 | ID: 3"];
};
Plugin.getItemContext = async (key, value) => {
    return `Item context for ${key} and ${value}`;
};
// Enhanced method map with proper typing
Plugin.methods = {
    getList: async () => Plugin.getList(),
    getItemContext: async (key, value) => Plugin.getItemContext(key, value)
};
//# sourceMappingURL=plugin.js.map