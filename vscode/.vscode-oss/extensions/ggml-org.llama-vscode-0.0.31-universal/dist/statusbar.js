"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Statusbar = void 0;
const vscode_1 = __importDefault(require("vscode"));
class Statusbar {
    constructor(application) {
        this.llamaVscodeStatusBarItem = vscode_1.default.window.createStatusBarItem(vscode_1.default.StatusBarAlignment.Left, 100);
        this.showTextInfo = (text) => {
            if (text == undefined)
                this.llamaVscodeStatusBarItem.text = "llama-vscode";
            else
                this.llamaVscodeStatusBarItem.text = "llama-vscode | " + text;
        };
        this.showInfo = (data) => {
            if (data == undefined || data.content == undefined || data.content.trim() == "") {
                if (this.app.configuration.show_info) {
                    this.llamaVscodeStatusBarItem.text = `llama-vscode | ${this.app.configuration.getUiText("no suggestion")} | r: ${this.app.extraContext.chunks.length} / ${this.app.configuration.ring_n_chunks}, e: ${this.app.extraContext.ringNEvict}, q: ${this.app.extraContext.queuedChunks.length} / ${this.app.configuration.MAX_QUEUED_CHUNKS} | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms `;
                }
                else {
                    this.llamaVscodeStatusBarItem.text = `llama-vscode | ${this.app.configuration.getUiText("no suggestion")} | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms `;
                }
            }
            else {
                if (this.app.configuration.show_info) {
                    this.llamaVscodeStatusBarItem.text = `llama-vscode | c: ${data.tokens_cached} / ${data.generation_settings.n_ctx ?? 0}, r: ${this.app.extraContext.chunks.length} / ${this.app.configuration.ring_n_chunks}, e: ${this.app.extraContext.ringNEvict}, q: ${this.app.extraContext.queuedChunks.length} / ${this.app.configuration.MAX_QUEUED_CHUNKS} | p: ${data.timings?.prompt_n} (${data.timings?.prompt_ms?.toFixed(2)} ms, ${data.timings?.prompt_per_second?.toFixed(2)} t/s) | g: ${data.timings?.predicted_n} (${data.timings?.predicted_ms?.toFixed(2)} ms, ${data.timings?.predicted_per_second?.toFixed(2)} t/s) | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms `;
                }
                else {
                    this.llamaVscodeStatusBarItem.text = `llama-vscode | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms `;
                }
            }
            this.llamaVscodeStatusBarItem.show();
        };
        this.showCachedInfo = () => {
            if (this.app.configuration.show_info) {
                this.llamaVscodeStatusBarItem.text = `llama-vscode | C: ${this.app.lruResultCache.size()} / ${this.app.configuration.max_cache_keys} | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms`;
            }
            else {
                this.llamaVscodeStatusBarItem.text = `llama-vscode | t: ${Date.now() - this.app.extraContext.lastComplStartTime} ms`;
            }
            this.llamaVscodeStatusBarItem.show();
        };
        this.showTimeInfo = (startTime) => {
            this.llamaVscodeStatusBarItem.text = `llama-vscode | t: ${Date.now() - startTime} ms`;
            this.llamaVscodeStatusBarItem.show();
        };
        this.showThinkingInfo = () => {
            this.llamaVscodeStatusBarItem.text = `llama-vscode | ${this.app.configuration.getUiText("thinking...")}`;
            this.llamaVscodeStatusBarItem.show();
        };
        this.initializeStatusBar = () => {
            this.llamaVscodeStatusBarItem = vscode_1.default.window.createStatusBarItem(vscode_1.default.StatusBarAlignment.Right, 1000);
            this.llamaVscodeStatusBarItem.command = 'llama-vscode.showMenu';
            this.llamaVscodeStatusBarItem.tooltip = "Show llama-vscode menu (Ctrl+Shift+M)";
            this.updateStatusBarText();
            this.llamaVscodeStatusBarItem.show();
        };
        this.updateStatusBarText = () => {
            const editor = vscode_1.default.window.activeTextEditor;
            const currentLanguage = editor?.document.languageId;
            const isEnabled = this.app.configuration.enabled;
            const isLanguageEnabled = currentLanguage ? this.app.configuration.isCompletionEnabled(editor.document) : true;
            if (!isEnabled) {
                this.llamaVscodeStatusBarItem.text = "$(x) llama.vscode";
            }
            else if (currentLanguage && !isLanguageEnabled) {
                this.llamaVscodeStatusBarItem.text = `$(x) llama.vscode (${currentLanguage})`;
            }
            else {
                this.llamaVscodeStatusBarItem.text = "$(check) llama.vscode";
            }
        };
        this.registerEventListeners = (context) => {
            context.subscriptions.push(vscode_1.default.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('llama-vscode')) {
                    this.updateStatusBarText();
                }
            }), vscode_1.default.window.onDidChangeActiveTextEditor(() => {
                this.updateStatusBarText();
            }));
        };
        this.app = application;
    }
}
exports.Statusbar = Statusbar;
//# sourceMappingURL=statusbar.js.map