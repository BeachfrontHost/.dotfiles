"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const application_1 = require("./application");
let app;
function activate(context) {
    app = application_1.Application.getInstance(context);
    app.architect.setStatusBar(context);
    app.architect.setOnChangeConfiguration(context);
    app.architect.setCompletionProvider(context);
    app.architect.registerCommandManualCompletion(context);
    app.architect.registerCommandCopyChunks(context);
    app.architect.registerCommandAskAi(context);
    app.architect.registerCommandAskAiWithContext(context);
    app.architect.registerCommandAskAiWithTools(context);
    app.architect.registerCommandNoCacheCompletion(context);
    app.architect.setOnSaveFile(context);
    app.architect.setPeriodicRingBufferUpdate(context);
    app.architect.setClipboardEvents(context);
    app.architect.setOnChangeActiveFile(context);
    app.architect.registerCommandAcceptFirstLine(context);
    app.architect.registerCommandAcceptFirstWord(context);
    app.architect.registerCommandShowMenu(context);
    app.architect.registerCommandEditSelectedText(context);
    app.architect.registerCommandAcceptTextEdit(context);
    app.architect.registerCommandRejectTextEdit(context);
    app.architect.setOnSaveDeleteFileForDb(context);
    app.architect.setOnChangeWorkspaceFolders(context);
    app.architect.registerGenarateCommitMsg(context);
    app.architect.registerCommandKillAgent(context);
    app.architect.registerWebviewProvider(context);
    app.architect.init();
}
exports.activate = activate;
async function deactivate() {
    // VS Code will dispose all registerd disposables
    app.llamaServer.killFimCmd();
    app.llamaServer.killChatCmd();
    app.llamaServer.killEmbeddingsCmd();
    app.llamaServer.killToolsCmd();
    app.llamaServer.killCommandCmd();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map