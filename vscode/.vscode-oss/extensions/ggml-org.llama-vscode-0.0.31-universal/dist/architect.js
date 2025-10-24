"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Architect = void 0;
// TODO
// Идеи
// - Използване на групи от агенти
// - използване lSP и linters
const vscode = __importStar(require("vscode"));
const llama_webview_provider_1 = require("./llama-webview-provider");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
class Architect {
    constructor(application) {
        this.init = async () => {
            // Start indexing workspace files
            this.indexWorspaceFiles();
            let isFirstStart = this.app.persistence.getGlobalValue("isFirstStart");
            if (isFirstStart == undefined || isFirstStart) {
                this.app.menu.showHowToUseLlamaVscode();
                this.app.persistence.setGlobalValue("isFirstStart", false);
            }
            await this.installUpgradeLlamaCpp(isFirstStart);
            if (this.app.configuration.env_start_last_used) {
                let lastEnv = this.app.persistence.getValue("selectedEnv");
                if (lastEnv) {
                    if (this.app.configuration.env_start_last_used_confirm) {
                        let [shouldSelect, dontAskAgain] = await utils_1.Utils.showYesYesdontaskNoDialog("You are about the select the env below. If there are local models inside, they will be downloaded (if not yet done) and llama.cpp server(s) will be started. \n\n" +
                            this.app.envService.getEnvDetailsAsString(lastEnv) +
                            "\n\n Do you want to continue?");
                        if (shouldSelect)
                            this.app.envService.selectEnv(lastEnv, false);
                        if (dontAskAgain)
                            this.app.configuration.updateConfigValue("env_start_last_used_confirm", false);
                    }
                    else {
                        this.app.envService.selectEnv(lastEnv, false);
                    }
                }
            }
            let lastChat = this.app.persistence.getValue(constants_1.PERSISTENCE_KEYS.SELECTED_CHAT);
            if (lastChat)
                this.app.menu.selectUpdateChat(lastChat);
            let lastAgent = this.app.persistence.getValue(constants_1.PERSISTENCE_KEYS.SELECTED_AGENT);
            if (lastAgent)
                this.app.agentService.selectAgent(lastAgent);
            this.app.tools.init();
        };
        this.setOnSaveDeleteFileForDb = (context) => {
            const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
                try {
                    if (!this.app.configuration.rag_enabled || this.app.configuration.rag_max_files <= 0)
                        return;
                    if (!this.app.chatContext.isImageOrVideoFile(document.uri.toString())) {
                        // Update after a delay and only if the file is not changed in the meantime to avoid too often updates
                        let updateTime = Date.now();
                        let fileProperties = this.app.chatContext.getFileProperties(document.uri.toString());
                        if (fileProperties)
                            fileProperties.updated = updateTime;
                        setTimeout(async () => {
                            if (fileProperties && fileProperties.updated > updateTime) {
                                return;
                            }
                            this.app.chatContext.addDocument(document.uri.toString(), document.getText());
                        }, 5000);
                    }
                }
                catch (error) {
                    console.error('Failed to add document to RAG:', error);
                }
            });
            context.subscriptions.push(saveListener);
            // Add file delete listener for RAG
            const deleteListener = vscode.workspace.onDidDeleteFiles(async (event) => {
                if (!this.app.configuration.rag_enabled || this.app.configuration.rag_max_files <= 0)
                    return;
                for (const file of event.files) {
                    try {
                        await this.app.chatContext.removeDocument(file.toString());
                    }
                    catch (error) {
                        console.error('Failed to remove document from RAG:', error);
                    }
                }
            });
            context.subscriptions.push(deleteListener);
        };
        this.setOnChangeConfiguration = (context) => {
            let configurationChangeDisp = vscode.workspace.onDidChangeConfiguration((event) => {
                const config = vscode.workspace.getConfiguration("llama-vscode");
                this.app.configuration.updateOnEvent(event, config);
                if (this.app.configuration.isRagConfigChanged(event))
                    this.init();
                if (this.app.configuration.isToolChanged(event))
                    this.app.tools.init();
                if (this.app.configuration.isEnvViewSettingChanged(event))
                    this.app.llamaWebviewProvider.updateLlamaView();
                vscode.window.showInformationMessage(this.app.configuration.getUiText(`llama-vscode extension is updated.`) ?? "");
            });
            context.subscriptions.push(configurationChangeDisp);
        };
        this.setOnChangeActiveFile = (context) => {
            let changeActiveTextEditorDisp = vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (!editor || !editor.document || !this.app.configuration.isCompletionEnabled(editor.document))
                    return;
                const previousEditor = vscode.window.activeTextEditor;
                if (previousEditor) {
                    setTimeout(async () => {
                        this.app.extraContext.pickChunkAroundCursor(previousEditor.selection.active.line, previousEditor.document);
                    }, 0);
                }
                if (editor) {
                    // Editor is now active in the UI, pick a chunk
                    let activeDocument = editor.document;
                    const selection = editor.selection;
                    const cursorPosition = selection.active;
                    setTimeout(async () => {
                        this.app.extraContext.pickChunkAroundCursor(cursorPosition.line, activeDocument);
                    }, 0);
                }
            });
            context.subscriptions.push(changeActiveTextEditorDisp);
        };
        this.registerCommandAcceptFirstLine = (context) => {
            const acceptFirstLineCommand = vscode.commands.registerCommand('extension.acceptFirstLine', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                await this.app.completion.insertFirstLine(editor);
            });
            context.subscriptions.push(acceptFirstLineCommand);
        };
        this.registerCommandAcceptFirstWord = (context) => {
            const acceptFirstWordCommand = vscode.commands.registerCommand('extension.acceptFirstWord', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                await this.app.completion.insertNextWord(editor);
            });
            context.subscriptions.push(acceptFirstWordCommand);
        };
        this.registerCommandShowMenu = (context) => {
            const showMenuCommand = vscode.commands.registerCommand('extension.showMenu', async () => {
                await this.app.menu.showMenu(context);
            });
            context.subscriptions.push(showMenuCommand);
        };
        this.setPeriodicRingBufferUpdate = (context) => {
            const ringBufferIntervalId = setInterval(this.app.extraContext.periodicRingBufferUpdate, this.app.configuration.ring_update_ms);
            const rungBufferUpdateDisposable = {
                dispose: () => {
                    clearInterval(ringBufferIntervalId);
                }
            };
            context.subscriptions.push(rungBufferUpdateDisposable);
        };
        this.setOnSaveFile = (context) => {
            const onSaveDocDisposable = vscode.workspace.onDidSaveTextDocument(this.app.extraContext.handleDocumentSave);
            context.subscriptions.push(onSaveDocDisposable);
        };
        this.setOnChangeWorkspaceFolders = (context) => {
            // Listen for new workspace folders being added
            context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(event => {
                event.added.forEach(folder => {
                    this.indexWorspaceFiles();
                });
            }));
        };
        this.registerGenarateCommitMsg = (context) => {
            const generateCommitCommand = vscode.commands.registerCommand('extension.generateGitCommitMessage', async () => {
                await this.app.git.generateCommitMessage();
            });
            context.subscriptions.push(generateCommitCommand);
        };
        this.registerCommandManualCompletion = (context) => {
            const triggerManualCompletionDisposable = vscode.commands.registerCommand('extension.triggerInlineCompletion', async () => {
                // Manual triggering of the completion with a shortcut
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
            });
            context.subscriptions.push(triggerManualCompletionDisposable);
        };
        this.registerCommandNoCacheCompletion = (context) => {
            const triggerNoCacheCompletionDisposable = vscode.commands.registerCommand('extension.triggerNoCacheCompletion', async () => {
                // Manual triggering of the completion with a shortcut
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                // Hide the current suggestion to force VS Code to call the completion provider instead of using cache
                await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
                // Wait a tiny bit to ensure VS Code processes the command
                await new Promise(resolve => setTimeout(resolve, 50));
                this.app.completion.isForcedNewRequest = true;
                vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
            });
            context.subscriptions.push(triggerNoCacheCompletionDisposable);
        };
        this.registerCommandCopyChunks = (context) => {
            const triggerCopyChunksDisposable = vscode.commands.registerCommand('extension.copyChunks', async () => {
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                let eventLogsCombined = "";
                if (this.app.logger.eventlogs.length > 0) {
                    eventLogsCombined = this.app.logger.eventlogs.reverse().reduce((accumulator, currentValue) => accumulator + currentValue + "\n", "");
                }
                let extraContext = "";
                if (this.app.extraContext.chunks.length > 0) {
                    extraContext = this.app.extraContext.chunks.reduce((accumulator, currentValue) => accumulator + "Time: " + currentValue.time + "\nFile Name: " + currentValue.filename + "\nText:\n" + currentValue.text + "\n\n", "");
                }
                let completionCache = "";
                if (this.app.lruResultCache.size() > 0) {
                    completionCache = Array.from(this.app.lruResultCache.getMap().entries()).reduce((accumulator, [key, value]) => accumulator + "Key: " + key + "\nCompletion:\n" + value + "\n\n", "");
                }
                let firstChunks = "";
                if (this.app.chatContext.entries.size > 0) {
                    firstChunks = Array.from(this.app.chatContext.entries.entries()).slice(0, 5).reduce((accumulator, [key, value]) => accumulator + "ID: " + key + "\nFile:\n" + value.uri +
                        "\nfirst line:\n" + value.firstLine +
                        "\nlast line:\n" + value.lastLine +
                        "\nChunk:\n" + value.content + "\n\n", "");
                }
                vscode.env.clipboard.writeText("Events:\n" + eventLogsCombined +
                    "\n\n------------------------------\n" +
                    "Extra context: \n" + extraContext +
                    "\n\n------------------------------\nCompletion cache: \n" + completionCache +
                    "\n\n------------------------------\nChunks: \n" + firstChunks);
            });
            context.subscriptions.push(triggerCopyChunksDisposable);
        };
        this.setCompletionProvider = (context) => {
            const providerDisposable = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
                provideInlineCompletionItems: async (document, position, context, token) => {
                    if (!this.app.configuration.isCompletionEnabled(document)) {
                        return undefined;
                    }
                    return await this.app.completion.getCompletionItems(document, position, context, token);
                }
            });
            context.subscriptions.push(providerDisposable);
        };
        this.setClipboardEvents = (context) => {
            const copyCmd = vscode.commands.registerCommand('extension.copyIntercept', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.document || !this.app.configuration.isCompletionEnabled(editor.document)) {
                    // Delegate to the built-in paste action
                    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
                    return;
                }
                let selectedLines = this.app.extraContext.addChunkFromSelection(editor);
                // Delegate to the built-in command to complete the actual copy
                await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
            });
            context.subscriptions.push(copyCmd);
            const cutCmd = vscode.commands.registerCommand('extension.cutIntercept', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.document || !this.app.configuration.isCompletionEnabled(editor.document)) {
                    // Delegate to the built-in paste action
                    await vscode.commands.executeCommand('editor.action.clipboardCutAction');
                    return;
                }
                let selectedLines = this.app.extraContext.addChunkFromSelection(editor);
                // Delegate to the built-in cut
                await vscode.commands.executeCommand('editor.action.clipboardCutAction');
            });
            context.subscriptions.push(cutCmd);
        };
        this.setStatusBar = (context) => {
            this.app.statusbar.initializeStatusBar();
            this.app.statusbar.registerEventListeners(context);
            context.subscriptions.push(vscode.commands.registerCommand('llama-vscode.showMenu', async () => {
                await this.app.menu.showMenu(context);
            }));
        };
        this.registerCommandAskAi = (context) => {
            const triggerAskAiDisposable = vscode.commands.registerCommand('extension.askAi', async () => {
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                this.app.askAi.showChatWithAi(false, context);
            });
            context.subscriptions.push(triggerAskAiDisposable);
        };
        this.registerCommandAskAiWithContext = (context) => {
            const triggerAskAiDisposable = vscode.commands.registerCommand('extension.askAiWithContext', async () => {
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                this.app.askAi.showChatWithAi(true, context);
            });
            context.subscriptions.push(triggerAskAiDisposable);
        };
        this.registerCommandAskAiWithTools = (context) => {
            const triggerAskAiDisposable = vscode.commands.registerCommand('extension.askAiWithTools', async () => {
                if (!vscode.window.activeTextEditor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                this.app.askAi.showChatWithTools(context);
            });
            context.subscriptions.push(triggerAskAiDisposable);
        };
        this.registerCommandEditSelectedText = (context) => {
            const editSelectedTextDisposable = vscode.commands.registerCommand('extension.editSelectedText', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor!');
                    return;
                }
                await this.app.textEditor.showEditPrompt(editor);
            });
            context.subscriptions.push(editSelectedTextDisposable);
        };
        this.registerCommandAcceptTextEdit = (context) => {
            const acceptTextEditDisposable = vscode.commands.registerCommand('extension.acceptTextEdit', async () => {
                await this.app.textEditor.acceptSuggestion();
            });
            context.subscriptions.push(acceptTextEditDisposable);
        };
        this.registerCommandRejectTextEdit = (context) => {
            context.subscriptions.push(vscode.commands.registerCommand('extension.rejectTextEdit', () => {
                this.app.textEditor.rejectSuggestion();
            }));
        };
        this.registerCommandKillAgent = (context) => {
            context.subscriptions.push(vscode.commands.registerCommand('extension.killAgent', () => {
                this.app.llamaAgent.stopAgent();
            }));
        };
        this.registerWebviewProvider = (context) => {
            const webviewProvider = vscode.window.registerWebviewViewProvider(llama_webview_provider_1.LlamaWebviewProvider.viewType, this.app.llamaWebviewProvider);
            context.subscriptions.push(webviewProvider);
            // Register command to show the webview
            const showWebviewCommand = vscode.commands.registerCommand('extension.showLlamaWebview', async () => {
                vscode.commands.executeCommand('llama-vscode.webview.focus');
                this.app.llamaWebviewProvider.setView("agent");
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.selection) {
                    let fileLongName = editor.document.fileName;
                    const parts = fileLongName.split(/[\\/]/);
                    let fileShortName = parts[parts.length - 1];
                    if (!editor.selection.isEmpty) {
                        let sel = editor.selection;
                        this.app.llamaAgent.addContextProjectFile(fileLongName + "|" + (sel.start.line + 1) + "|" + (sel.end.line + 1), fileShortName + "|" + (sel.start.line + 1) + "|" + (sel.end.line + 1));
                    }
                    else {
                        this.app.llamaAgent.addContextProjectFile(fileLongName, fileShortName);
                    }
                }
                // Send a message to focus the textarea after a short delay
                setTimeout(() => {
                    if (this.app.llamaWebviewProvider.webview) {
                        this.app.llamaWebviewProvider.webview.webview.postMessage({
                            command: 'focusTextarea'
                        });
                        const contextFiles = this.app.llamaAgent.getContextProjectFiles();
                        this.app.llamaWebviewProvider.webview.webview.postMessage({
                            command: 'updateContextFiles',
                            files: Array.from(contextFiles.entries())
                        });
                    }
                }, 100);
            });
            context.subscriptions.push(showWebviewCommand);
            // Register command to send messages to the webview
            const postMessageCommand = vscode.commands.registerCommand('llama-vscode.webview.postMessage', (message) => {
                console.log('PostMessage command called with:', message);
                if (this.app.llamaWebviewProvider.webview) {
                    console.log('Webview found, sending message');
                    this.app.llamaWebviewProvider.webview.webview.postMessage(message);
                }
                else {
                    console.log('Webview not found');
                    vscode.window.showWarningMessage('Webview not ready yet. Please try again.');
                }
            });
            context.subscriptions.push(postMessageCommand);
        };
        this.app = application;
    }
    async installUpgradeLlamaCpp(isFirstStart) {
        if (!this.app.configuration.ask_install_llamacpp)
            return;
        let result = await utils_1.Utils.executeTerminalCommand("llama-server --version");
        if (result.includes("command not found") || result.includes("is not recognized")) {
            let questionInstall = "llama.cpp will be installed as it is requred by llama-vscode extension.";
            if (process.platform == 'win32')
                questionInstall += "\nVS Code will be restarted.";
            let shouldInstall = await utils_1.Utils.showUserChoiceDialog(questionInstall, "Confirm");
            if (shouldInstall) {
                await this.app.menu.installLlamacpp();
                this.app.persistence.setGlobalValue("last_llama_cpp", (new Date()).toISOString());
                if (process.platform == 'win32') {
                    setTimeout(() => {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }, 2000);
                }
            }
            else {
                let questionStopAskingLlamaCppInstall = "Do you prefer to stop getting a suggestion to install llama.cpp?";
                let shouldStopAsking = await utils_1.Utils.showUserChoiceDialog(questionStopAskingLlamaCppInstall, "Yes");
                if (shouldStopAsking)
                    this.app.configuration.updateConfigValue("ask_install_llamacpp", false);
            }
        }
        else {
            // Upgrade llama.cpp only if not upgraded at ask_upgrade_llamacpp_hours hours
            let lastUpgradeDateStr = this.app.persistence.getGlobalValue("last_llama_cpp");
            if (!lastUpgradeDateStr || utils_1.Utils.isTimeToUpgrade(new Date(lastUpgradeDateStr), new Date(), this.app.configuration.ask_upgrade_llamacpp_hours)) {
                let questionInstall = "Do you want to upgrade llama.cpp (used for running local models)? (recommended).";
                let shouldInstall = await utils_1.Utils.showUserChoiceDialog(questionInstall, "Confirm"); //yes, don't ask again
                if (shouldInstall) {
                    await this.app.menu.installLlamacpp();
                    this.app.persistence.setGlobalValue("last_llama_cpp", (new Date()).toISOString());
                    // Ако не е първо пускане на лама вскоде и не е направно до сега - махни -fa от командите
                    if (!isFirstStart && !lastUpgradeDateStr) {
                        let chatModels = this.app.configuration.chat_models_list;
                        let toolsModels = this.app.configuration.tools_models_list;
                        let envs = this.app.configuration.envs_list;
                        utils_1.Utils.removeFaOptionFromModels(chatModels);
                        utils_1.Utils.removeFaOptionFromModels(toolsModels);
                        utils_1.Utils.removeFaOptionFromEnvs(envs);
                        this.app.configuration.updateConfigValue(constants_1.SETTING_NAME_FOR_LIST.CHAT_MODELS, chatModels);
                        this.app.configuration.updateConfigValue(constants_1.SETTING_NAME_FOR_LIST.TOOLS_MODELS, toolsModels);
                        this.app.configuration.updateConfigValue(constants_1.SETTING_NAME_FOR_LIST.ENVS, envs);
                    }
                }
                else {
                    let questionStopAskingLlamaCppUpgrade = "Do you prefer to stop getting a suggestion to upgrade llama.cpp?";
                    let shouldStopAsking = await utils_1.Utils.showUserChoiceDialog(questionStopAskingLlamaCppUpgrade, "Yes");
                    if (shouldStopAsking) {
                        if (!lastUpgradeDateStr)
                            this.app.persistence.setGlobalValue("last_llama_cpp", (new Date()).toISOString());
                        this.app.configuration.updateConfigValue("ask_upgrade_llamacpp_hours", 72000); // more than 8 years
                    }
                }
            }
        }
    }
    indexWorspaceFiles() {
        if (this.app.configuration.rag_enabled) {
            setTimeout(() => {
                this.app.chatContext.indexWorkspaceFiles().catch(error => {
                    console.error('Failed to index workspace files:', error);
                });
            }, 0);
        }
    }
    getChatEndpoint() {
        let endpoint = this.app.configuration.endpoint_chat;
        let chatModel = this.app.menu.getChatModel();
        if (chatModel && chatModel.endpoint)
            endpoint = chatModel.endpoint;
        return endpoint;
    }
}
exports.Architect = Architect;
//# sourceMappingURL=architect.js.map