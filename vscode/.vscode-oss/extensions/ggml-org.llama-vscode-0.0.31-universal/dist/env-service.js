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
exports.EnvService = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("../types");
const utils_1 = require("../utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lists_1 = require("../lists");
const constants_1 = require("../constants");
class EnvService {
    constructor(app) {
        this.app = app;
    }
    getActions() {
        return [
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartEnv) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopEnv) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addEnv) ?? "",
                description: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addEnvDescription) ?? "",
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewEnvDetails) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteEnv) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportEnv) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importEnv) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.downloadUploadEnvsOnline) ?? ""
            },
        ];
    }
    async processActions(selected) {
        switch (selected.label) {
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartEnv):
                await this.selectEnv(this.app.configuration.envs_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addEnv):
                await this.addEnv(this.app.configuration.envs_list, constants_1.SETTING_NAME_FOR_LIST.ENVS);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteEnv):
                await this.deleteEnv(this.app.configuration.envs_list, constants_1.SETTING_NAME_FOR_LIST.ENVS);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewEnvDetails):
                await this.viewEnv(this.app.configuration.envs_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopEnv):
                await this.stopEnv();
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportEnv):
                await this.exportEnv(this.app.configuration.envs_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importEnv):
                await this.importEnv(this.app.configuration.envs_list, constants_1.SETTING_NAME_FOR_LIST.ENVS);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.downloadUploadEnvsOnline):
                await vscode.env.openExternal(vscode.Uri.parse('https://github.com/ggml-org/llama.vscode/discussions'));
                break;
        }
    }
    async selectEnv(envsList) {
        let allEnvs = envsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS));
        let envsItems = this.getStandardQpList(envsList, "");
        envsItems = envsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS), "(predefined) ", envsList.length));
        let lastUsedEnv = this.app.persistence.getValue(constants_1.PERSISTENCE_KEYS.SELECTED_ENV);
        if (lastUsedEnv && lastUsedEnv.name.trim() !== "") {
            envsItems.push({ label: (envsItems.length + 1) + ". Last used env", description: lastUsedEnv.name });
        }
        const envItem = await vscode.window.showQuickPick(envsItems);
        if (envItem) {
            let selectedEnv;
            if (envItem.label.includes("Last used env")) {
                selectedEnv = lastUsedEnv;
            }
            else {
                const index = parseInt(envItem.label.split(". ")[0], 10) - 1;
                selectedEnv = allEnvs[index];
            }
            if (selectedEnv) {
                await this.selectStartEnv(selectedEnv, true);
                return selectedEnv;
            }
        }
        return undefined;
    }
    async selectStartEnv(env, confirm = false) {
        // Get current state for inheritance
        const currentComplModel = this.app.menu.getComplModel();
        const currentChatModel = this.app.menu.getChatModel();
        const currentEmbeddingsModel = this.app.menu.getEmbeddingsModel();
        const currentToolsModel = this.app.menu.getToolsModel();
        const currentAgent = this.app.menu.getAgent();
        const currentRagEnabled = this.app.configuration.rag_enabled;
        const currentEnvStartLastUsed = this.app.configuration.env_start_last_used;
        const currentComplEnabled = this.app.configuration.enabled;
        // Kill all servers
        await this.app.llamaServer.killFimCmd();
        await this.app.llamaServer.killChatCmd();
        await this.app.llamaServer.killEmbeddingsCmd();
        await this.app.llamaServer.killToolsCmd();
        let shouldSelect = true;
        if (confirm) {
            // Build temp env with inheritance for details
            const tempEnv = {
                ...env,
                completion: env.completion ?? currentComplModel,
                chat: env.chat ?? currentChatModel,
                embeddings: env.embeddings ?? currentEmbeddingsModel,
                tools: env.tools ?? currentToolsModel,
                agent: env.agent ?? currentAgent,
                ragEnabled: env.ragEnabled ?? currentRagEnabled,
                envStartLastUsed: env.envStartLastUsed ?? currentEnvStartLastUsed,
                complEnabled: env.complEnabled ?? currentComplEnabled,
            };
            shouldSelect = await utils_1.Utils.confirmAction("You are about to select the env below. If there are local models inside, they will be downloaded (if not yet done) and llama.cpp server(s) will be started.\n\n Do you want to continue?", this.getEnvDetailsAsString(tempEnv));
        }
        if (shouldSelect && env) {
            // Set completion model (inherit if not specified)
            const complModel = env.completion ?? currentComplModel;
            this.app.menu.setSelectedModel(types_1.ModelType.Completion, complModel);
            if (complModel && complModel.name.trim() !== "") {
                await this.app.modelService.addApiKey(complModel);
                if (complModel.localStartCommand) {
                    await this.app.llamaServer.shellFimCmd(this.app.modelService.sanitizeCommand(complModel.localStartCommand));
                }
            }
            // Set chat model
            const chatModel = env.chat ?? currentChatModel;
            this.app.menu.setSelectedModel(types_1.ModelType.Chat, chatModel);
            if (chatModel && chatModel.name.trim() !== "") {
                await this.app.modelService.addApiKey(chatModel);
                if (chatModel.localStartCommand) {
                    await this.app.llamaServer.shellChatCmd(this.app.modelService.sanitizeCommand(chatModel.localStartCommand));
                }
            }
            // Set embeddings model
            const embedModel = env.embeddings ?? currentEmbeddingsModel;
            this.app.menu.setSelectedModel(types_1.ModelType.Embeddings, embedModel);
            if (embedModel && embedModel.name.trim() !== "") {
                await this.app.modelService.addApiKey(embedModel);
                if (embedModel.localStartCommand) {
                    await this.app.llamaServer.shellEmbeddingsCmd(this.app.modelService.sanitizeCommand(embedModel.localStartCommand));
                }
            }
            // Set tools model
            const toolsModel = env.tools ?? currentToolsModel;
            this.app.menu.setSelectedModel(types_1.ModelType.Tools, toolsModel);
            if (toolsModel && toolsModel.name.trim() !== "") {
                await this.app.modelService.addApiKey(toolsModel);
                if (toolsModel.localStartCommand) {
                    await this.app.llamaServer.shellToolsCmd(this.app.modelService.sanitizeCommand(toolsModel.localStartCommand));
                }
            }
            // Set agent
            const agent = env.agent ?? currentAgent;
            if (agent) {
                await this.app.menu.selectAgent(agent);
            }
            // Set configs if specified in env
            if (env.ragEnabled !== undefined) {
                this.app.configuration.updateConfigValue("rag_enabled", env.ragEnabled);
            }
            if (env.envStartLastUsed !== undefined) {
                this.app.configuration.updateConfigValue("env_start_last_used", env.envStartLastUsed);
            }
            if (env.complEnabled !== undefined) {
                this.app.configuration.updateConfigValue("enabled", env.complEnabled);
            }
            // Set selected env
            this.app.menu.setSelectedEnv(env);
            this.app.llamaWebviewProvider.updateLlamaView();
        }
    }
    async addEnv(envsList, settingName) {
        let name = await utils_1.Utils.getValidatedInput('name for your env (required)', (input) => input.trim() !== '', 5, {
            placeHolder: 'Enter a user friendly name for your env (required)',
            value: ''
        });
        if (name === undefined) {
            vscode.window.showInformationMessage("Env addition cancelled.");
            return;
        }
        name = this.app.modelService.sanitizeInput(name);
        let description = await vscode.window.showInputBox({
            placeHolder: 'description for the env - what is the purpose, when to select etc. ',
            prompt: 'Enter description for the env.',
            value: ''
        });
        description = this.app.modelService.sanitizeInput(description || '');
        // Inherit from current state
        const currentComplModel = this.app.menu.getComplModel();
        const currentChatModel = this.app.menu.getChatModel();
        const currentEmbeddingsModel = this.app.menu.getEmbeddingsModel();
        const currentToolsModel = this.app.menu.getToolsModel();
        const currentAgent = this.app.menu.getAgent();
        let newEnv = {
            name: name,
            description: description,
            completion: currentComplModel.name.trim() !== "" ? currentComplModel : undefined,
            chat: currentChatModel.name.trim() !== "" ? currentChatModel : undefined,
            embeddings: currentEmbeddingsModel.name.trim() !== "" ? currentEmbeddingsModel : undefined,
            tools: currentToolsModel.name.trim() !== "" ? currentToolsModel : undefined,
            agent: currentAgent.name.trim() !== "" ? currentAgent : undefined,
            ragEnabled: this.app.configuration.rag_enabled,
            envStartLastUsed: this.app.configuration.env_start_last_used,
            complEnabled: this.app.configuration.enabled
        };
        await this.persistEnv(newEnv, envsList, settingName);
    }
    async persistEnv(newEnv, envsList, settingName) {
        let envDetails = this.getEnvDetailsAsString(newEnv);
        const shouldAddEnv = await utils_1.Utils.confirmAction("A new env will be added. Do you want to add the env?", envDetails);
        if (shouldAddEnv) {
            envsList.push(newEnv);
            this.app.configuration.updateConfigValue(settingName, envsList);
            vscode.window.showInformationMessage("The env is added.");
        }
    }
    async deleteEnv(envsList, settingName) {
        const envsItems = this.getStandardQpList(envsList, "");
        const envItem = await vscode.window.showQuickPick(envsItems);
        if (envItem) {
            let envIndex = parseInt(envItem.label.split(". ")[0], 10) - 1;
            const shouldDeleteEnv = await utils_1.Utils.confirmAction("Are you sure you want to delete the following env?", this.getEnvDetailsAsString(envsList[envIndex]));
            if (shouldDeleteEnv) {
                envsList.splice(envIndex, 1);
                this.app.configuration.updateConfigValue(settingName, envsList);
                vscode.window.showInformationMessage("The env is deleted.");
            }
        }
    }
    async viewEnv(envsList) {
        let allEnvs = envsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS));
        let envsItems = this.getStandardQpList(envsList, "");
        envsItems = envsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS), "(predefined) ", envsList.length));
        let envItem = await vscode.window.showQuickPick(envsItems);
        if (envItem) {
            let envIndex = parseInt(envItem.label.split(". ")[0], 10) - 1;
            let selectedEnv = allEnvs[envIndex];
            let envDetails = this.getEnvDetailsAsString(selectedEnv);
            await utils_1.Utils.showOkDialog(envDetails);
        }
    }
    async stopEnv() {
        await this.app.llamaServer.killFimCmd();
        this.app.menu.setSelectedModel(types_1.ModelType.Completion, { name: "", localStartCommand: "" });
        await this.app.llamaServer.killChatCmd();
        this.app.menu.setSelectedModel(types_1.ModelType.Chat, { name: "", localStartCommand: "" });
        await this.app.llamaServer.killEmbeddingsCmd();
        this.app.menu.setSelectedModel(types_1.ModelType.Embeddings, { name: "", localStartCommand: "" });
        await this.app.llamaServer.killToolsCmd();
        this.app.menu.setSelectedModel(types_1.ModelType.Tools, { name: "", localStartCommand: "" });
        this.app.menu.deselectAgent();
        this.app.menu.setSelectedEnv({ name: "" });
        this.app.llamaWebviewProvider.updateLlamaView();
        vscode.window.showInformationMessage("Env, models and agent are deselected.");
    }
    async exportEnv(envsList) {
        let allEnvs = envsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS));
        let envsItems = this.getStandardQpList(envsList, "");
        envsItems = envsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.ENVS), "(predefined) ", envsList.length));
        let envItem = await vscode.window.showQuickPick(envsItems);
        if (envItem) {
            let envIndex = parseInt(envItem.label.split(". ")[0], 10) - 1;
            let selectedEnv = allEnvs[envIndex];
            let shouldExport = await utils_1.Utils.showYesNoDialog("Do you want to export the following env? \n\n" +
                this.getEnvDetailsAsString(selectedEnv));
            if (shouldExport) {
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath || '', selectedEnv.name + '.json')),
                    filters: {
                        'Env Files': ['json'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Export Env'
                });
                if (uri) {
                    const jsonContent = JSON.stringify(selectedEnv, null, 2);
                    fs.writeFileSync(uri.fsPath, jsonContent, 'utf8');
                    vscode.window.showInformationMessage("Env is saved.");
                }
            }
        }
    }
    async importEnv(envsList, settingName) {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Import Env',
            filters: {
                'Env Files': ['json'],
                'All Files': ['*']
            },
        });
        if (!uris || uris.length === 0) {
            return;
        }
        const filePath = uris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let newEnv = JSON.parse(fileContent);
        // Sanitize imported env
        this.sanitizeEnv(newEnv);
        await this.persistEnv(newEnv, envsList, settingName);
    }
    sanitizeEnv(env) {
        if (env.name)
            env.name = this.app.modelService.sanitizeInput(env.name);
        if (env.description)
            env.description = this.app.modelService.sanitizeInput(env.description);
        // Sanitize completion model
        if (env.completion) {
            if (env.completion.name)
                env.completion.name = this.app.modelService.sanitizeInput(env.completion.name);
            if (env.completion.localStartCommand)
                env.completion.localStartCommand = this.app.modelService.sanitizeCommand(env.completion.localStartCommand);
            if (env.completion.endpoint)
                env.completion.endpoint = this.app.modelService.sanitizeInput(env.completion.endpoint);
            if (env.completion.aiModel)
                env.completion.aiModel = this.app.modelService.sanitizeInput(env.completion.aiModel);
        }
        // Similarly for chat
        if (env.chat) {
            if (env.chat.name)
                env.chat.name = this.app.modelService.sanitizeInput(env.chat.name);
            if (env.chat.localStartCommand)
                env.chat.localStartCommand = this.app.modelService.sanitizeCommand(env.chat.localStartCommand);
            if (env.chat.endpoint)
                env.chat.endpoint = this.app.modelService.sanitizeInput(env.chat.endpoint);
            if (env.chat.aiModel)
                env.chat.aiModel = this.app.modelService.sanitizeInput(env.chat.aiModel);
        }
        // Embeddings
        if (env.embeddings) {
            if (env.embeddings.name)
                env.embeddings.name = this.app.modelService.sanitizeInput(env.embeddings.name);
            if (env.embeddings.localStartCommand)
                env.embeddings.localStartCommand = this.app.modelService.sanitizeCommand(env.embeddings.localStartCommand);
            if (env.embeddings.endpoint)
                env.embeddings.endpoint = this.app.modelService.sanitizeInput(env.embeddings.endpoint);
            if (env.embeddings.aiModel)
                env.embeddings.aiModel = this.app.modelService.sanitizeInput(env.embeddings.aiModel);
        }
        // Tools
        if (env.tools) {
            if (env.tools.name)
                env.tools.name = this.app.modelService.sanitizeInput(env.tools.name);
            if (env.tools.localStartCommand)
                env.tools.localStartCommand = this.app.modelService.sanitizeCommand(env.tools.localStartCommand);
            if (env.tools.endpoint)
                env.tools.endpoint = this.app.modelService.sanitizeInput(env.tools.endpoint);
            if (env.tools.aiModel)
                env.tools.aiModel = this.app.modelService.sanitizeInput(env.tools.aiModel);
        }
        // Agent
        if (env.agent) {
            if (env.agent.name)
                env.agent.name = this.app.modelService.sanitizeInput(env.agent.name);
            if (env.agent.description)
                env.agent.description = this.app.modelService.sanitizeInput(env.agent.description);
            if (env.agent.systemInstruction) {
                env.agent.systemInstruction = env.agent.systemInstruction.map((s) => this.app.modelService.sanitizeInput(s));
            }
        }
    }
    getEnvDetailsAsString(env) {
        return "Env details: " +
            "\nname: " + env.name +
            "\ndescription: " + env.description +
            "\n\ncompletion model: " +
            "\nname: " + (env.completion?.name || "") +
            "\nlocal start command: " + (env.completion?.localStartCommand || "") +
            "\nendpoint: " + (env.completion?.endpoint || "") +
            "\nmodel name for provider: " + (env.completion?.aiModel || "") +
            "\napi key required: " + (env.completion?.isKeyRequired || false) +
            "\n\nchat model: " +
            "\nname: " + (env.chat?.name || "") +
            "\nlocal start command: " + (env.chat?.localStartCommand || "") +
            "\nendpoint: " + (env.chat?.endpoint || "") +
            "\nmodel name for provider: " + (env.chat?.aiModel || "") +
            "\napi key required: " + (env.chat?.isKeyRequired || false) +
            "\n\nembeddings model: " +
            "\nname: " + (env.embeddings?.name || "") +
            "\nlocal start command: " + (env.embeddings?.localStartCommand || "") +
            "\nendpoint: " + (env.embeddings?.endpoint || "") +
            "\nmodel name for provider: " + (env.embeddings?.aiModel || "") +
            "\napi key required: " + (env.embeddings?.isKeyRequired || false) +
            "\n\ntools model: " +
            "\nname: " + (env.tools?.name || "") +
            "\nlocal start command: " + (env.tools?.localStartCommand || "") +
            "\nendpoint: " + (env.tools?.endpoint || "") +
            "\nmodel name for provider: " + (env.tools?.aiModel || "") +
            "\napi key required: " + (env.tools?.isKeyRequired || false) +
            "\n\nagent: " +
            "\nname: " + (env.agent?.name || "") +
            "\ndescription: " + (env.agent?.description || "") +
            "\n\ncompletions enabled: " + (env.complEnabled ?? "") +
            "\n\nrag enabled: " + (env.ragEnabled ?? "") +
            "\n\nenv start last: " + (env.envStartLastUsed ?? "");
    }
    getStandardQpList(list, prefix, lastEnvNumber = 0) {
        const items = [];
        let i = lastEnvNumber;
        for (let elem of list) {
            i++;
            items.push({
                label: i + ". " + prefix + elem.name,
                description: elem.description,
            });
        }
        return items;
    }
}
exports.EnvService = EnvService;
//# sourceMappingURL=env-service.js.map