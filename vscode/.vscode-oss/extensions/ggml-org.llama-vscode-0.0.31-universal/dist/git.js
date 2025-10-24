"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Git = void 0;
const vscode_1 = __importDefault(require("vscode"));
const utils_1 = require("./utils");
class Git {
    constructor(application) {
        this.generateCommitMessage = async () => {
            let chatUrl = this.app.configuration.endpoint_chat;
            if (!chatUrl)
                chatUrl = this.app.configuration.endpoint_tools;
            let chatModel = this.app.menu.getChatModel();
            if (!this.app.menu.isChatModelSelected())
                chatModel = this.app.menu.getToolsModel();
            if (chatModel.endpoint) {
                const chatEndpoint = utils_1.Utils.trimTrailingSlash(chatModel.endpoint);
                chatUrl = chatEndpoint ? chatEndpoint + "/" : "";
            }
            if (!chatUrl) {
                const shouldSelectModel = await utils_1.Utils.showUserChoiceDialog("Select a chat or tools model or an env with chat or tools model to generate a commit message.", "Select");
                if (shouldSelectModel) {
                    this.app.menu.showEnvView();
                    vscode_1.default.window.showInformationMessage("After the chat/tools model is loaded, try again generating commit message.");
                    return;
                }
                else {
                    vscode_1.default.window.showErrorMessage("No endpoint for the chat model. Select a chat or tools model or an env with chat or tools model or enter the endpoint of a running llama.cpp server with chat model in setting endpoint_chat. ");
                    return;
                }
            }
            const gitExtension = vscode_1.default.extensions.getExtension('vscode.git')?.exports;
            const git = gitExtension?.getAPI(1);
            if (!git) {
                vscode_1.default.window.showErrorMessage('extension vscode.git not found');
                return;
            }
            if (git.repositories.length === 0) {
                vscode_1.default.window.showErrorMessage('can`t use on non git dir');
                return;
            }
            const repo = git.repositories[0];
            try {
                let diff = await repo.diff(true);
                if (!diff || diff.trim() === '') {
                    // use unstaged change
                    diff = await repo.diff(false);
                    if (!diff || diff.trim() === '') {
                        vscode_1.default.window.showWarningMessage('git diff is empty');
                        return;
                    }
                    vscode_1.default.window.showWarningMessage('git staged change is empty, using unstaged change');
                }
                const prompt = this.app.prompts.replaceOnePlaceholder(this.app.prompts.CREATE_GIT_DIFF_COMMIT, "diff", diff);
                vscode_1.default.window.withProgress({
                    location: vscode_1.default.ProgressLocation.SourceControl,
                    title: 'llama.vscode is generating a commit message...',
                    cancellable: false
                }, async (progress) => {
                    try {
                        // TODO stream output the commit message, need for llamaServer with stream output support
                        const completion = await this.app.llamaServer.getChatCompletion(prompt);
                        const commitMessage = completion?.choices[0]?.message.content;
                        if (commitMessage) {
                            repo.inputBox.value = commitMessage;
                        }
                        else {
                            vscode_1.default.window.showErrorMessage('unexpected error for generating commit message is empty');
                        }
                    }
                    catch (error) {
                        vscode_1.default.window.showErrorMessage(`errors in generateCommitMessage: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    progress.report({ increment: 100 });
                });
            }
            catch (error) {
                vscode_1.default.window.showErrorMessage(`errors in generateCommitMessage: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
        this.getLatestChanges = async () => {
            const gitExtension = vscode_1.default.extensions.getExtension('vscode.git')?.exports;
            const git = gitExtension?.getAPI(1);
            if (!git) {
                vscode_1.default.window.showErrorMessage('extension vscode.git not found');
                return "";
            }
            if (git.repositories.length === 0) {
                vscode_1.default.window.showErrorMessage('can`t use on non git dir');
                return "";
            }
            const repo = git.repositories[0];
            try {
                let diff = await repo.diff(true);
                if (!diff || diff.trim() === '') {
                    // use unstaged change
                    diff = await repo.diff(false);
                    if (!diff || diff.trim() === '') {
                        vscode_1.default.window.showWarningMessage('git diff is empty');
                        return "";
                    }
                    vscode_1.default.window.showWarningMessage('git staged change is empty, using unstaged change');
                }
                return diff ?? "";
            }
            catch (error) {
                vscode_1.default.window.showErrorMessage(`errors in generateCommitMessage: ${error instanceof Error ? error.message : String(error)}`);
                return "";
            }
        };
        this.app = application;
    }
}
exports.Git = Git;
//# sourceMappingURL=git.js.map