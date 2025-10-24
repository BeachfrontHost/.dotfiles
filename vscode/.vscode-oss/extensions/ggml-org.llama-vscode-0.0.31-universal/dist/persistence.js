"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Persistence = void 0;
class Persistence {
    constructor(app, context) {
        this.uniquePrefix = "llama.vscode.";
        this.apiKeysMapPrefix = "apiKeys.";
        this.chatsName = "chats";
        this.getApiKey = (endpoint) => {
            return this.context.globalState.get(this.uniquePrefix + this.apiKeysMapPrefix + endpoint);
        };
        this.setApiKey = (endpoint, apiKey) => {
            this.context.globalState.update(this.uniquePrefix + this.apiKeysMapPrefix + endpoint, apiKey);
        };
        this.deleteApiKey = (endpoint) => {
            this.context.globalState.update(this.uniquePrefix + this.apiKeysMapPrefix + endpoint, undefined);
        };
        this.getAllApiKeys = () => {
            const apiKeys = this.context.globalState.keys().filter(key => key.startsWith(this.uniquePrefix + this.apiKeysMapPrefix));
            let apiKeysMap = new Map();
            for (let key of apiKeys) {
                apiKeysMap.set(key.slice((this.uniquePrefix + this.apiKeysMapPrefix).length), this.context.workspaceState.get(key) ?? "");
            }
            return apiKeysMap;
        };
        this.setValue = async (key, value) => {
            await this.context.workspaceState.update(this.uniquePrefix + key, value);
        };
        this.getValue = (key) => {
            return this.context.workspaceState.get(this.uniquePrefix + key);
        };
        this.setChats = async (value) => {
            try {
                await this.context.workspaceState.update(this.uniquePrefix + this.chatsName, value);
            }
            catch (error) {
                console.log(error);
            }
        };
        this.getChats = () => {
            return this.context.workspaceState.get(this.uniquePrefix + this.chatsName);
        };
        this.deleteValue = (key) => {
            this.context.workspaceState.update(this.uniquePrefix + key, undefined);
        };
        this.setGlobalValue = async (key, value) => {
            await this.context.globalState.update(this.uniquePrefix + key, value);
        };
        this.getGlobalValue = (key) => {
            return this.context.globalState.get(this.uniquePrefix + key);
        };
        this.deleteGlobalValue = (key) => {
            this.context.globalState.update(this.uniquePrefix + key, undefined);
        };
        this.context = context;
        this.app = app;
    }
}
exports.Persistence = Persistence;
//# sourceMappingURL=persistence.js.map