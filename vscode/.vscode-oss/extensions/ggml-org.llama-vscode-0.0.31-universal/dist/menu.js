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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menu = void 0;
const vscode_1 = __importDefault(require("vscode"));
const utils_1 = require("./utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const lists_1 = require("./lists");
class Menu {
    constructor(application) {
        this.selectedComplModel = Menu.emptyModel;
        this.selectedModel = Menu.emptyModel;
        this.selectedEmbeddingsModel = Menu.emptyModel;
        this.selectedToolsModel = Menu.emptyModel;
        this.selectedEnv = { name: "" };
        this.selectedAgent = { name: "", systemInstruction: [] };
        this.selectedChat = { name: "", id: "" };
        this.startModelDetail = "Selects the model and if local also downloads the model (if not yet done) and starts a llama-server with it.";
        this.uiCache = {};
        this.createMenuItems = (currentLanguage, isLanguageEnabled) => {
            let menuItems = [
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.actions),
                    kind: vscode_1.default.QuickPickItemKind.Separator
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartEnv) ?? "",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.envSelectDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopEnv),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopEnvDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedEnv),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedEnvDescription)
                },
                {
                    label: (this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showLlamaAgent) ?? "") + " (Ctrl+Shif+A)",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showLlamaAgentDescription)
                },
                {
                    label: (this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAI) ?? "") + " (Ctrl+;)",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAIDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedModels),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedModelsDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.useAsLocalAIRunner),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.localAIRunnerDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.entities),
                    kind: vscode_1.default.QuickPickItemKind.Separator
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.envs) ?? "",
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.completionModels) ?? ""
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatModels) ?? ""
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.embeddingsModels) ?? ""
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.toolsModels) ?? ""
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.apiKeys),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.apiKeysDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.agents),
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.agentCommands),
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chats),
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.maintenance),
                    kind: vscode_1.default.QuickPickItemKind.Separator
                },
                {
                    label: "Install/upgrade llama.cpp",
                    description: "Installs/upgrades llama.cpp server"
                },
                {
                    label: `${this.app.configuration.enabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.disable) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.enable)} ${this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.allCompletions)}`,
                    description: `${this.app.configuration.enabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.turnOffCompletionsGlobally) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.turnOnCompletionsGlobally)}`
                },
                currentLanguage ? {
                    label: `${isLanguageEnabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.disable) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.enable)} ${this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.completionsFor)} ${currentLanguage}`,
                    description: `${this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.currently)} ${isLanguageEnabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.enabled) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.disabled)}`
                } : null,
                {
                    label: `${this.app.configuration.rag_enabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.disable) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.enable)} ${this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.rag)}`,
                    description: `${this.app.configuration.rag_enabled ? this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.turnOffRAG) : this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.turnOnRAG)}`
                },
                {
                    label: "$(gear) " + this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.editSettings),
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.help),
                    kind: vscode_1.default.QuickPickItemKind.Separator
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.howToUseLlamaVscode),
                },
                {
                    label: (this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAIAboutLlamaVscode) ?? ""),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAIAboutLlamaVscodeDescription)
                },
                {
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.howToDeleteModels),
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.howToDeleteModelsDescription)
                },
                {
                    label: "$(book) " + this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewDocumentation),
                },
            ];
            if (this.app.configuration.launch_training_completion.trim() != "") {
                menuItems.push({
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.startTrainingCompletionModel) ?? "",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.launchTrainingCompletionDescription)
                });
            }
            if (this.app.configuration.launch_training_chat.trim() != "") {
                menuItems.push({
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.startTrainingChatModel) ?? "",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.launchTrainingChatDescription)
                });
            }
            if (this.app.configuration.launch_training_completion.trim() != "" || this.app.configuration.launch_training_chat.trim() != "") {
                menuItems.push({
                    label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.stopTraining) ?? "",
                    description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.stopTrainingDescription)
                });
            }
            return menuItems.filter(Boolean);
        };
        this.handleMenuSelection = async (selected, currentLanguage, languageSettings, context) => {
            switch (selected.label) {
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartEnv):
                    await this.app.envService.selectEnv(this.app.configuration.envs_list, true);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopEnv):
                    await this.app.envService.stopEnv();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedEnv):
                    this.showCurrentEnv();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAI) + " (Ctrl+;)":
                    this.app.askAi.showChatWithAi(false, context);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAIAboutLlamaVscode):
                    const helpAgent = this.app.configuration.agents_list.find(a => a.name === constants_1.AGENT_NAME.llamaVscodeHelp);
                    if (helpAgent) {
                        await this.app.agentService.selectAgent(helpAgent);
                    }
                    this.showAgentView();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showLlamaAgent) + " (Ctrl+Shif+A)":
                    await this.showAgentView();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatWithAIWithProjectContext) + " (Ctrl+Shift+;)":
                    if (this.app.configuration.rag_enabled) {
                        this.app.askAi.showChatWithAi(true, context);
                    }
                    else {
                        vscode_1.default.window.showInformationMessage("RAG is not enabled. Please enable it from llama-vscode before using this feature.");
                    }
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.showSelectedModels):
                    this.showCurrentEnv();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.useAsLocalAIRunner):
                    vscode_1.default.commands.executeCommand('extension.showLlamaWebview');
                    this.app.llamaWebviewProvider.setView("airunner");
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.completionModels) ?? "":
                    await this.processModelActions(constants_1.ModelType.Completion);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chatModels) ?? "":
                    await this.processModelActions(constants_1.ModelType.Chat);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.embeddingsModels) ?? "":
                    await this.processModelActions(constants_1.ModelType.Embeddings);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.toolsModels) ?? "":
                    await this.processModelActions(constants_1.ModelType.Tools);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.envs) ?? "":
                    let envsActions = this.app.envService.getActions();
                    let envSelected = await vscode_1.default.window.showQuickPick(envsActions);
                    if (envSelected)
                        await this.app.envService.processActions(envSelected);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.agents) ?? "":
                    let agentsActions = this.app.agentService.getActions();
                    let actionSelected = await vscode_1.default.window.showQuickPick(agentsActions);
                    if (actionSelected)
                        await this.app.agentService.processActions(actionSelected);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.agentCommands) ?? "":
                    let agentCommandsActions = this.getAgentCommandsActions();
                    let agentCommandSelected = await vscode_1.default.window.showQuickPick(agentCommandsActions);
                    if (agentCommandSelected)
                        this.processAgentCommandsActions(agentCommandSelected);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.chats) ?? "":
                    let chatsActions = this.getChatActions();
                    let chatSelected = await vscode_1.default.window.showQuickPick(chatsActions);
                    if (chatSelected)
                        this.processChatActions(chatSelected);
                    break;
                case "$(gear) " + this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.editSettings):
                    await vscode_1.default.commands.executeCommand('workbench.action.openSettings', 'llama-vscode');
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.startTrainingCompletionModel):
                    await this.app.llamaServer.killTrainCmd();
                    await this.app.llamaServer.shellTrainCmd(this.app.modelService.sanitizeCommand(this.app.configuration.launch_training_completion));
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.startTrainingChatModel):
                    await this.app.llamaServer.killTrainCmd();
                    await this.app.llamaServer.shellTrainCmd(this.app.modelService.sanitizeCommand(this.app.configuration.launch_training_chat));
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.stopTraining):
                    await this.app.llamaServer.killTrainCmd();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.apiKeys):
                    let apiKeysActions = [
                        {
                            label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAPIKey) ?? ""
                        },
                        {
                            label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.editDeleteAPIKey) ?? ""
                        },
                    ];
                    let apiKeyActionSelected = await vscode_1.default.window.showQuickPick(apiKeysActions);
                    if (apiKeyActionSelected)
                        this.processApiKeyActions(apiKeyActionSelected);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.howToDeleteModels):
                    utils_1.Utils.showOkDialog("The automatically downloaded models (llama-server started with -hf option) are stored as follows: \nIn Windows in folder C:\\Users\\<user_name>\\AppData\\Local\\llama.cpp. \nIn Mac or Linux the folder could be /users/<user_name>/Library/Caches/llama.cpp. \nYou could delete them from the folder.");
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.howToUseLlamaVscode):
                    this.showHowToUseLlamaVscode();
                    break;
                case "$(book) " + this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewDocumentation):
                    await vscode_1.default.env.openExternal(vscode_1.default.Uri.parse('https://github.com/ggml-org/llama.vscode/wiki'));
                    break;
                case "Install/upgrade llama.cpp":
                    await this.installLlamacpp();
                    break;
                default:
                    await this.handleCompletionToggle(selected.label, currentLanguage, languageSettings);
                    await this.handleRagToggle(selected.label, currentLanguage, languageSettings);
                    break;
            }
            this.app.statusbar.updateStatusBarText();
        };
        this.selectChatFromList = async () => {
            let chatsList = this.app.persistence.getChats();
            if (!chatsList || chatsList.length == 0) {
                vscode_1.default.window.showInformationMessage("No chats in the history.");
                return;
            }
            const chatsItems = this.getStandardQpList(chatsList, "");
            const chat = await vscode_1.default.window.showQuickPick(chatsItems);
            if (chat) {
                let futureChat;
                futureChat = chatsList[parseInt(chat.label.split(". ")[0], 10) - 1];
                if (!futureChat) {
                    vscode_1.default.window.showWarningMessage("No chat selected.");
                    return;
                }
                await this.selectUpdateChat(futureChat);
            }
        };
        this.selectUpdateChat = async (chatToSelect) => {
            if (chatToSelect.id != this.selectedChat.id) {
                await this.updateChatHistory();
                this.selectedChat = chatToSelect;
                await this.app.persistence.setValue(constants_1.PERSISTENCE_KEYS.SELECTED_CHAT, this.selectedChat);
                this.app.llamaAgent.selectChat(this.selectedChat);
                this.app.llamaWebviewProvider.updateLlamaView();
            }
            else {
                this.selectedChat = chatToSelect;
                await this.app.persistence.setValue(constants_1.PERSISTENCE_KEYS.SELECTED_CHAT, this.selectedChat);
            }
        };
        this.deleteChatFromList = async (chatList) => {
            const chatsItems = this.getStandardQpList(chatList, "");
            const chat = await vscode_1.default.window.showQuickPick(chatsItems);
            if (chat) {
                const shoulDeleteChat = await utils_1.Utils.confirmAction("Are you sure you want to delete the chat below?", "name: " + chat.label + "\ndescription: " + chat.description);
                if (shoulDeleteChat) {
                    let chatToDelIndex = parseInt(chat.label.split(". ")[0], 10) - 1;
                    chatList.splice(chatToDelIndex, 1);
                    await this.app.persistence.setChats(chatList);
                    vscode_1.default.window.showInformationMessage("The chat is deleted: " + chat.label);
                }
            }
        };
        this.updateChatHistory = async () => {
            // if chat exists - update it, otherwise, just add it
            if (this.isChatSelected()) {
                let chatToAdd = this.selectedChat;
                await this.addChatToHistory(chatToAdd);
            }
        };
        this.showMenu = async (context) => {
            const currentLanguage = vscode_1.default.window.activeTextEditor?.document.languageId;
            const isLanguageEnabled = currentLanguage ? this.app.configuration.isCompletionEnabled(undefined, currentLanguage) : true;
            const items = this.app.menu.createMenuItems(currentLanguage, isLanguageEnabled);
            const selected = await vscode_1.default.window.showQuickPick(items, { title: "Llama Menu" });
            if (selected) {
                await this.handleMenuSelection(selected, currentLanguage, this.app.configuration.languageSettings, context);
            }
        };
        this.getComplModel = () => {
            return this.selectedComplModel;
        };
        this.getToolsModel = () => {
            return this.selectedToolsModel;
        };
        this.getChatModel = () => {
            return this.selectedModel;
        };
        this.getEmbeddingsModel = () => {
            return this.selectedEmbeddingsModel;
        };
        this.clearModel = (type) => {
            switch (type) {
                case constants_1.ModelType.Completion:
                    this.selectedComplModel = Menu.emptyModel;
                    break;
                case constants_1.ModelType.Chat:
                    this.selectedModel = Menu.emptyModel;
                    break;
                case constants_1.ModelType.Embeddings:
                    this.selectedEmbeddingsModel = Menu.emptyModel;
                    break;
                case constants_1.ModelType.Tools:
                    this.selectedToolsModel = Menu.emptyModel;
                    break;
            }
            this.app.llamaWebviewProvider.updateLlamaView();
        };
        this.setSelectedModel = (type, model) => {
            switch (type) {
                case constants_1.ModelType.Completion:
                    this.selectedComplModel = model ?? Menu.emptyModel;
                    break;
                case constants_1.ModelType.Chat:
                    this.selectedModel = model ?? Menu.emptyModel;
                    break;
                case constants_1.ModelType.Embeddings:
                    this.selectedEmbeddingsModel = model ?? Menu.emptyModel;
                    break;
                case constants_1.ModelType.Tools:
                    this.selectedToolsModel = model ?? Menu.emptyModel;
                    break;
            }
            this.app.llamaWebviewProvider.updateLlamaView();
        };
        this.getEnv = () => {
            return this.selectedEnv;
        };
        this.getAgent = () => {
            return this.selectedAgent;
        };
        this.getChat = () => {
            return this.selectedChat;
        };
        this.isComplModelSelected = () => {
            return this.selectedComplModel != undefined && this.selectedComplModel.name.trim() != "";
        };
        this.isChatModelSelected = () => {
            return this.selectedModel != undefined && this.selectedModel.name.trim() != "";
        };
        this.isToolsModelSelected = () => {
            return this.selectedToolsModel != undefined && this.selectedToolsModel.name.trim() != "";
        };
        this.isEmbeddingsModelSelected = () => {
            return this.selectedEmbeddingsModel != undefined && this.selectedToolsModel.name.trim() != "";
        };
        this.isEnvSelected = () => {
            return this.selectedEnv != undefined && this.selectedEnv.name.trim() != "";
        };
        this.isAgentSelected = () => {
            return this.selectedAgent != undefined && this.selectedAgent.name.trim() != "";
        };
        this.isChatSelected = () => {
            return this.selectedChat != undefined && this.selectedChat.name.trim() != "";
        };
        this.processAgentCommandsActions = async (selected) => {
            switch (selected.label) {
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAgentCommand):
                    // await this.addModelToList(toolsTypeDetails);
                    utils_1.Utils.showOkDialog("You could add an agent command in setting agent_commands or use export, modify and import.");
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteAgentCommand):
                    await this.deleteAgentCommandFromList(this.app.configuration.agent_commands, "agent_commands");
                    // Utils.showOkDialog("You could delete an agent command in setting agent_commands")
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewAgentCommandDetails):
                    await this.viewAgentCommandFromList(this.app.configuration.agent_commands);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportAgentCommand):
                    await this.exportAgentCommandFromList(this.app.configuration.agent_commands);
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importAgentCommand):
                    await this.importAgentCommandToList(this.app.configuration.agent_commands, "agent_commands");
                    break;
            }
        };
        this.processChatActions = async (selected) => {
            switch (selected.label) {
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartChat):
                    await this.selectChatFromList();
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteChat):
                    await this.deleteChatFromList(this.app.persistence.getChats());
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportChat):
                    await this.exportChatFromList(this.app.persistence.getChats());
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importChat):
                    await this.importChatToList();
                    break;
            }
        };
        this.processApiKeyActions = async (selected) => {
            switch (selected.label) {
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.editDeleteAPIKey):
                    const apiKeysMap = this.app.persistence.getAllApiKeys();
                    const apiKeysQuickPick = Array.from(apiKeysMap.entries()).map(([key, value]) => ({
                        label: key,
                        description: "..." + value.slice(-5)
                    }));
                    const selectedItem = await vscode_1.default.window.showQuickPick(apiKeysQuickPick);
                    if (selectedItem) {
                        let result = await vscode_1.default.window.showInputBox({
                            placeHolder: 'Enter your new api key for ' + selectedItem.label + ". Leave empty to remove it.",
                            prompt: 'your api key',
                            value: ''
                        });
                        result = this.app.modelService.sanitizeInput(result || '');
                        if (!result || result === "")
                            this.app.persistence.deleteApiKey(selectedItem.label);
                        else
                            this.app.persistence.setApiKey(selectedItem.label, result);
                    }
                    break;
                case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAPIKey) ?? "":
                    let endpoint = await vscode_1.default.window.showInputBox({
                        placeHolder: 'Enter the endpoint, exactly as in the model',
                        prompt: 'Endpoint (url)',
                        value: ''
                    });
                    endpoint = this.app.modelService.sanitizeInput(endpoint || '');
                    let apiKey = await vscode_1.default.window.showInputBox({
                        placeHolder: 'Enter your new api key for ' + endpoint,
                        prompt: 'your api key',
                        value: ''
                    });
                    apiKey = this.app.modelService.sanitizeInput(apiKey || '');
                    if (endpoint && apiKey) {
                        this.app.persistence.setApiKey(endpoint, apiKey);
                        vscode_1.default.window.showInformationMessage("Api key is added.");
                    }
                    else
                        vscode_1.default.window.showErrorMessage("API key was not added. Please provide both endpoint and API key.");
                    break;
            }
        };
        this.app = application;
    }
    setSelectedAgent(agent) {
        this.selectedAgent = agent;
    }
    async processModelActions(modelType) {
        let modelActions = this.app.modelService.getActions(modelType);
        let actionSelected = await vscode_1.default.window.showQuickPick(modelActions);
        if (actionSelected) {
            await this.app.modelService.processActions(modelType, actionSelected);
        }
    }
    async showAgentView() {
        let isModelAvailable = await this.checkForToolsModel();
        if (isModelAvailable) {
            vscode_1.default.commands.executeCommand('extension.showLlamaWebview');
            this.app.llamaWebviewProvider.updateLlamaView();
            setTimeout(() => {
                if (this.app.llamaWebviewProvider.webview) {
                    this.app.llamaWebviewProvider.webview.webview.postMessage({
                        command: 'focusTextarea'
                    });
                }
            }, 100);
        }
    }
    async addChatToHistory(chatToAdd) {
        let chats = this.app.persistence.getChats();
        if (!chats)
            chats = [];
        const index = chats.findIndex((ch) => ch.id === chatToAdd.id);
        if (index !== -1) {
            chats.splice(index, 1);
        }
        chats.push(chatToAdd);
        if (chats.length > this.app.configuration.chats_max_history)
            chats.shift();
        await this.app.persistence.setChats(chats);
        vscode_1.default.window.showInformationMessage("The chat '" + chatToAdd.name + "' is added/updated.");
    }
    async checkForToolsModel() {
        let toolsModel = this.app.menu.getToolsModel();
        let targetUrl = this.app.configuration.endpoint_tools ? this.app.configuration.endpoint_tools + "/" : "";
        if (toolsModel && toolsModel.endpoint) {
            const toolsEndpoint = utils_1.Utils.trimTrailingSlash(toolsModel.endpoint);
            targetUrl = toolsEndpoint ? toolsEndpoint + "/" : "";
        }
        if (!targetUrl) {
            const shouldSelectEnv = await utils_1.Utils.showUserChoiceDialog("Select a tools model or an env with tools model to use Llama Agent.", "Select");
            if (shouldSelectEnv) {
                // await this.app.menu.selectEnvFromList(this.app.configuration.envs_list.filter(item => item.tools != undefined && item.tools.name));
                this.showEnvView();
                vscode_1.default.window.showInformationMessage("After the tools model is loaded, try again opening llama agent.");
            }
            else {
                vscode_1.default.window.showErrorMessage("No endpoint for the tools model. Select an env with tools model or enter the endpoint of a running llama.cpp server with tools model in setting endpoint_tools. ");
            }
            return false;
        }
        else
            return true;
    }
    // selectEnv moved to EnvService.selectStartEnv (with inheritance)
    async installLlamacpp() {
        if (process.platform != 'darwin' && process.platform != 'win32') {
            vscode_1.default.window.showInformationMessage("Automatic install/upgrade is supported only for Mac and Windows for now. Download llama.cpp package manually and add the folder to the path. Visit github.com/ggml-org/llama.vscode/wiki for details.");
        }
        else {
            await this.app.llamaServer.killCommandCmd();
            let terminalCommand = process.platform === 'darwin' ? "brew install llama.cpp" : process.platform === 'win32' ? "winget install llama.cpp" : "";
            // await this.app.llamaServer.shellCommandCmd(terminalCommand);
            await this.app.llamaServer.executeCommandWithTerminalFeedback(terminalCommand);
        }
    }
    async activateModel(selModelPropName, killCmd, shellCmd) {
        let selModel = this[selModelPropName];
        this.app.modelService.addApiKey(selModel);
        await this.app.persistence.setValue(selModelPropName, selModel);
        await killCmd();
        if (selModel.localStartCommand)
            await shellCmd(this.app.modelService.sanitizeCommand(selModel.localStartCommand ?? ""));
        this.app.llamaWebviewProvider.updateLlamaView();
    }
    getChatActions() {
        return [
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartChat) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteChat) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportChat) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importChat) ?? ""
            },
        ];
    }
    showCurrentEnv() {
        utils_1.Utils.showOkDialog(this.getSelectionsAsString());
    }
    showHowToUseLlamaVscode() {
        utils_1.Utils.showOkDialog("How to use llama-vscode" +
            "\n\nTL;DR: install llama.cpp, select env, start using" +
            "\n\nllama-vscode is an extension for code completion, chat with ai and agentic coding, focused on local model usage with llama.cpp." +
            "\n\n1. Install llama.cpp " +
            "\n  - Show the extension menu by clicking llama-vscode in the status bar or by Ctrl+Shift+M and select 'Install/upgrade llama.cpp' (sometimes restart is needed to adjust the paths to llama-server)" +
            "\n\n2. Select env (group of models) for your needs from llama-vscode menu." +
            "\n  - This will download (only the first time) the models and run llama.cpp servers locally (or use external servers endpoints, depends on env)" +
            "\n\n3. Start using llama-vscode" +
            "\n  - For code completion - just start typing (uses completion model)" +
            "\n  - For edit code with AI - select code, right click and select 'llama-vscode Edit Selected Text with AI' (uses chat model, no tools support required)" +
            "\n  - For chat with AI (quick questions to (local) AI instead of searching with google) - select 'Chat with AI' from llama.vscode menu (uses chat model, no tools support required, llama.cpp server should run on model endpoint.)" +
            "\n  - For agentic coding - select 'Show Llama Agent' from llama.vscode menu (or Ctrl+Shift+A) and start typing your questions or requests (uses tools model and embeddings model for some tools, most intelligence needed, local usage supported, but you could also use external, paid providers for better results)" +
            "\n\n If you want to use llama-vscode only for code completion - you could disable RAG from llama-vscode menu to avoid indexing files." +
            "\n\n If you are an existing user - you could continue using llama-vscode as before." +
            "\n\n For more details - select 'Chat with AI about llama.vscode' or 'View Documentation' from llama-vscode menu" +
            "\n\n Enjoy!");
    }
    async viewAgentCommandFromList(agentCommands) {
        let allAgentCommands = agentCommands.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENT_COMMANDS));
        let agentComandItems = this.getStandardQpList(agentCommands, "");
        agentComandItems = agentComandItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENT_COMMANDS), "(predefined) ", agentCommands.length));
        let agentCommand = await vscode_1.default.window.showQuickPick(agentComandItems);
        if (agentCommand) {
            let agentCommandIndex = parseInt(agentCommand.label.split(". ")[0], 10) - 1;
            let selectedAgentCommand = allAgentCommands[agentCommandIndex];
            await this.showAgentCommandDetails(selectedAgentCommand);
        }
    }
    async deleteAgentCommandFromList(agentCommands, settingName) {
        const modelsItems = this.getStandardQpList(agentCommands, "");
        const model = await vscode_1.default.window.showQuickPick(modelsItems);
        if (model) {
            let modelIndex = parseInt(model.label.split(". ")[0], 10) - 1;
            const shoulDeleteModel = await utils_1.Utils.confirmAction("Are you sure you want to delete the agent command below?", this.getAgentCommandDetailsAsString(agentCommands[modelIndex]));
            if (shoulDeleteModel) {
                agentCommands.splice(modelIndex, 1);
                this.app.configuration.updateConfigValue(settingName, agentCommands);
                vscode_1.default.window.showInformationMessage("The agent command is deleted.");
            }
        }
    }
    async showAgentCommandDetails(selectedAgentCommand) {
        await utils_1.Utils.showOkDialog(this.getAgentCommandDetailsAsString(selectedAgentCommand));
    }
    getAgentCommandDetailsAsString(selectedAgentCommand) {
        return "Agent command details: " +
            "\nname: " + selectedAgentCommand.name +
            "\ndescription: " + selectedAgentCommand.description +
            "\nprompt: \n" + selectedAgentCommand.prompt.join("\n") +
            "\n\ncontext: " + (selectedAgentCommand.context ? selectedAgentCommand.context.join(", ") : "");
    }
    async persistAgentCommandToSetting(newAgentCommand, agentCommands, settingName) {
        let modelDetails = this.getAgentCommandDetailsAsString(newAgentCommand);
        const shouldAddModel = await utils_1.Utils.confirmAction("A new agent command will be added. Do you want to add the agent command?", modelDetails);
        if (shouldAddModel) {
            agentCommands.push(newAgentCommand);
            this.app.configuration.updateConfigValue(settingName, agentCommands);
            vscode_1.default.window.showInformationMessage("The agent command is added.");
        }
    }
    async importAgentCommandToList(agentCommands, settingName) {
        let name = "";
        const uris = await vscode_1.default.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Import Agent Command',
            filters: {
                'Agent Command Files': ['json'],
                'All Files': ['*']
            },
        });
        if (!uris || uris.length === 0) {
            return;
        }
        const filePath = uris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const newAgent = JSON.parse(fileContent);
        // Sanitize imported agent command
        if (newAgent.name)
            newAgent.name = this.app.modelService.sanitizeInput(newAgent.name);
        if (newAgent.description)
            newAgent.description = this.app.modelService.sanitizeInput(newAgent.description);
        if (newAgent.prompt)
            newAgent.prompt = newAgent.prompt.map((s) => this.app.modelService.sanitizeInput(s));
        if (newAgent.context)
            newAgent.context = newAgent.context.map((s) => this.app.modelService.sanitizeInput(s));
        await this.persistAgentCommandToSetting(newAgent, agentCommands, settingName);
    }
    async importChatToList() {
        let name = "";
        const uris = await vscode_1.default.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Import Chat',
            filters: {
                'Chat Files': ['json'],
                'All Files': ['*']
            },
        });
        if (!uris || uris.length === 0) {
            return;
        }
        const filePath = uris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const newChat = JSON.parse(fileContent);
        // Sanitize imported chat
        if (newChat.name)
            newChat.name = this.app.modelService.sanitizeInput(newChat.name);
        if (newChat.description)
            newChat.description = this.app.modelService.sanitizeInput(newChat.description);
        if (newChat.messages) {
            newChat.messages = newChat.messages.map((msg) => ({
                ...msg,
                content: this.app.modelService.sanitizeInput(msg.content || ''),
                role: this.app.modelService.sanitizeInput(msg.role || '')
            }));
        }
        await this.addChatToHistory(newChat);
    }
    getSelectionsAsString() {
        return "Selected env and models: " +
            "\nenv: " + this.selectedEnv.name +
            "\nenv description: " + this.selectedEnv.description +
            "\n\ncompletion model: " +
            "\nname: " + this.selectedComplModel?.name +
            "\nlocal start command: " + this.selectedComplModel.localStartCommand +
            "\nendpoint: " + this.selectedComplModel.endpoint +
            "\nmodel name for provider: " + this.selectedComplModel.aiModel +
            "\napi key required: " + this.selectedComplModel.isKeyRequired +
            "\n\nchat model: " +
            "\nname: " + this.selectedModel.name +
            "\nlocal start command: " + this.selectedModel.localStartCommand +
            "\nendpoint: " + this.selectedModel.endpoint +
            "\nmodel name for provider: " + this.selectedModel.aiModel +
            "\napi key required: " + this.selectedModel.isKeyRequired +
            "\n\nembeddings model: " +
            "\nname: " + this.selectedEmbeddingsModel.name +
            "\nlocal start command: " + this.selectedEmbeddingsModel.localStartCommand +
            "\nendpoint: " + this.selectedEmbeddingsModel.endpoint +
            "\nmodel name for provider: " + this.selectedEmbeddingsModel.aiModel +
            "\napi key required: " + this.selectedEmbeddingsModel.isKeyRequired +
            "\n\ntools model: " +
            "\nname: " + this.selectedToolsModel.name +
            "\nlocal start command: " + this.selectedToolsModel.localStartCommand +
            "\nendpoint: " + this.selectedToolsModel.endpoint +
            "\nmodel name for provider: " + this.selectedToolsModel.aiModel +
            "\napi key required: " + this.selectedToolsModel.isKeyRequired;
    }
    async exportAgentCommandFromList(agentCommands) {
        let allAgentCommands = agentCommands.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENT_COMMANDS));
        let agentComandItems = this.getStandardQpList(agentCommands, "");
        agentComandItems = agentComandItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENT_COMMANDS), "(predefined) ", agentCommands.length));
        let agentCommand = await vscode_1.default.window.showQuickPick(agentComandItems);
        if (agentCommand) {
            let modelIndex = parseInt(agentCommand.label.split(". ")[0], 10) - 1;
            let selectedAgentCommand = allAgentCommands[modelIndex];
            let shouldExport = await utils_1.Utils.showYesNoDialog("Do you want to export the following agent command? \n\n" +
                this.getAgentCommandDetailsAsString(selectedAgentCommand));
            if (shouldExport) {
                const uri = await vscode_1.default.window.showSaveDialog({
                    defaultUri: vscode_1.default.Uri.file(path.join(vscode_1.default.workspace.rootPath || '', selectedAgentCommand.name + '.json')),
                    filters: {
                        'Agent Command Files': ['json'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Export Agent Command'
                });
                if (!uri) {
                    return;
                }
                const jsonContent = JSON.stringify(selectedAgentCommand, null, 2);
                fs.writeFileSync(uri.fsPath, jsonContent, 'utf8');
                vscode_1.default.window.showInformationMessage("Agent command is saved.");
            }
        }
    }
    async exportChatFromList(chatsList) {
        const chatsItems = this.getStandardQpList(chatsList, "");
        let chat = await vscode_1.default.window.showQuickPick(chatsItems);
        if (chat) {
            let modelIndex = parseInt(chat.label.split(". ")[0], 10) - 1;
            let selectedChat = chatsList[modelIndex];
            let shouldExport = await utils_1.Utils.showYesNoDialog("Do you want to export the following chat? \n\n" +
                "name: " + chat.label +
                "\ndescription: " + chat.description);
            if (shouldExport) {
                const uri = await vscode_1.default.window.showSaveDialog({
                    defaultUri: vscode_1.default.Uri.file(path.join(vscode_1.default.workspace.rootPath || '', selectedChat.name + '.json')),
                    filters: {
                        'Chat Files': ['json'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Export Chat'
                });
                if (!uri) {
                    return;
                }
                const jsonContent = JSON.stringify(selectedChat, null, 2);
                fs.writeFileSync(uri.fsPath, jsonContent, 'utf8');
                vscode_1.default.window.showInformationMessage("Chat is saved.");
            }
        }
    }
    getStandardQpList(list, prefix, lastModelNumber = 0) {
        const items = [];
        let i = lastModelNumber;
        for (let elem of list) {
            i++;
            items.push({
                label: i + ". " + prefix + elem.name,
                description: elem.description,
            });
        }
        return items;
    }
    async setCompletion(enabled) {
        await this.app.configuration.updateConfigValue('enabled', enabled);
    }
    async handleCompletionToggle(label, currentLanguage, languageSettings) {
        if (label.includes(this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.allCompletions) ?? "")) {
            await this.app.configuration.updateConfigValue('enabled', !this.app.configuration.enabled);
        }
        else if (currentLanguage && label.includes(currentLanguage)) {
            const isLanguageEnabled = languageSettings[currentLanguage] ?? true;
            languageSettings[currentLanguage] = !isLanguageEnabled;
            await this.app.configuration.updateConfigValue('languageSettings', languageSettings);
        }
    }
    async handleRagToggle(label, currentLanguage, languageSettings) {
        if (label.includes(this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.rag) ?? "")) {
            await this.app.configuration.updateConfigValue('rag_enabled', !this.app.configuration.rag_enabled);
        }
    }
    async deselectAndClearModel(modelType) {
        await this.app.modelService.deselectModel(modelType, this.app.modelService.getTypeDetails(modelType));
        this.app.menu.clearModel(modelType);
        this.app.llamaWebviewProvider.updateLlamaView();
    }
    async selectAndSetModel(modelType, modelsList) {
        let model = await this.app.modelService.selectModel(modelType, modelsList);
        this.app.menu.setSelectedModel(modelType, model);
    }
    setSelectedEnv(env) {
        this.selectedEnv = env;
        this.app.persistence.setValue(constants_1.PERSISTENCE_KEYS.SELECTED_ENV, env);
        this.app.llamaWebviewProvider.updateLlamaView();
    }
    getAgentCommandsActions() {
        return [
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAgentCommand) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewAgentCommandDetails) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteAgentCommand) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportAgentCommand) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importAgentCommand) ?? ""
            },
        ];
    }
    showEnvView() {
        vscode_1.default.commands.executeCommand('extension.showLlamaWebview');
        setTimeout(() => this.app.llamaWebviewProvider.setView("addenv"), 500);
    }
}
exports.Menu = Menu;
Menu.emptyModel = { name: "" };
//# sourceMappingURL=menu.js.map