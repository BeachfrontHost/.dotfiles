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
exports.ModelService = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const lists_1 = require("../lists");
class ModelService {
    constructor(app) {
        this.selectModel = async (type, modelsList) => {
            const details = this.getTypeDetails(type);
            let allModels = modelsList.concat(lists_1.PREDEFINED_LISTS.get(type));
            let modelsItems = this.getModels(modelsList, "", true);
            modelsItems = modelsItems.concat(this.getModels(lists_1.PREDEFINED_LISTS.get(type), "(predefined) ", true, modelsList.length));
            const launchToEndpoint = new Map([
                ["launch_completion", "endpoint"],
                ["launch_chat", "endpoint_chat"],
                ["launch_embeddings", "endpoint_embeddings"],
                ["launch_tools", "endpoint_tools"]
            ]);
            modelsItems.push({ label: (modelsItems.length + 1) + ". Use settings", description: "" });
            const selectedModelItem = await vscode.window.showQuickPick(modelsItems);
            if (selectedModelItem) {
                let model;
                if (parseInt(selectedModelItem.label.split(". ")[0], 10) == modelsItems.length) {
                    // Use settings
                    const aiModel = this.app.configuration.ai_model;
                    const endpoint = this.app.configuration[launchToEndpoint.get(details.launchSettingName)];
                    const localStartCommand = this.app.configuration[details.launchSettingName];
                    model = {
                        name: "Use settings",
                        aiModel: aiModel,
                        isKeyRequired: false,
                        endpoint: endpoint,
                        localStartCommand: localStartCommand
                    };
                }
                else {
                    const index = parseInt(selectedModelItem.label.split(". ")[0], 10) - 1;
                    model = allModels[index];
                }
                await this.selectStartModel(model, type, details);
                return model;
            }
            return undefined;
        };
        this.sanitizeCommand = (command) => {
            if (!command)
                return '';
            // TODO Consider escaping some chars: return command.trim().replace(/[`#$\<>\?\\|!{}()[\]^"]/g, '\\$&');
            return command.trim();
        };
        this.app = app;
        this.strategies = {
            local: this.app.localModelStrategy,
            external: this.app.externalModelStrategy,
            hf: this.app.hfModelStrategy
        };
    }
    getActions(type) {
        const keys = {
            [constants_1.ModelType.Completion]: [
                constants_1.UI_TEXT_KEYS.selectStartCompletionModel,
                constants_1.UI_TEXT_KEYS.deselectStopCompletionModel,
                constants_1.UI_TEXT_KEYS.addLocalCompletionModel,
                constants_1.UI_TEXT_KEYS.addExternalCompletionModel,
                constants_1.UI_TEXT_KEYS.addCompletionModelFromHuggingface,
                constants_1.UI_TEXT_KEYS.viewCompletionModelDetails,
                constants_1.UI_TEXT_KEYS.deleteCompletionModel,
                constants_1.UI_TEXT_KEYS.exportCompletionModel,
                constants_1.UI_TEXT_KEYS.importCompletionModel,
            ],
            [constants_1.ModelType.Chat]: [
                constants_1.UI_TEXT_KEYS.selectStartChatModel,
                constants_1.UI_TEXT_KEYS.deselectStopChatModel,
                constants_1.UI_TEXT_KEYS.addLocalChatModel,
                constants_1.UI_TEXT_KEYS.addExternalChatModel,
                constants_1.UI_TEXT_KEYS.addChatModelFromHuggingface,
                constants_1.UI_TEXT_KEYS.viewChatModelDetails,
                constants_1.UI_TEXT_KEYS.deleteChatModel,
                constants_1.UI_TEXT_KEYS.exportChatModel,
                constants_1.UI_TEXT_KEYS.importChatModel,
            ],
            [constants_1.ModelType.Embeddings]: [
                constants_1.UI_TEXT_KEYS.selectStartEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.deselectStopEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.addLocalEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.addExternalEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.addEmbeddingsModelFromHuggingface,
                constants_1.UI_TEXT_KEYS.viewEmbeddingsModelDetails,
                constants_1.UI_TEXT_KEYS.deleteEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.exportEmbeddingsModel,
                constants_1.UI_TEXT_KEYS.importEmbeddingsModel,
            ],
            [constants_1.ModelType.Tools]: [
                constants_1.UI_TEXT_KEYS.selectStartToolsModel,
                constants_1.UI_TEXT_KEYS.deselectStopToolsModel,
                constants_1.UI_TEXT_KEYS.addLocalToolsModel,
                constants_1.UI_TEXT_KEYS.addExternalToolsModel,
                constants_1.UI_TEXT_KEYS.addToolsModelFromHuggingface,
                constants_1.UI_TEXT_KEYS.viewToolsModelDetails,
                constants_1.UI_TEXT_KEYS.deleteToolsModel,
                constants_1.UI_TEXT_KEYS.exportToolsModel,
                constants_1.UI_TEXT_KEYS.importToolsModel,
            ],
        };
        const modelKeys = keys[type] || [];
        return modelKeys.map(key => ({
            label: this.app.configuration.getUiText(key) ?? ""
        }));
    }
    async processActions(type, selected) {
        const details = this.getTypeDetails(type);
        const actionMap = this.getActionMap(type);
        const action = Object.keys(actionMap).find(key => selected.label === actionMap[key]);
        if (!action)
            return;
        switch (action) {
            case 'select':
                await this.selectModel(type, details.modelsList);
                break;
            case 'deselect':
                await this.deselectModel(type, details);
                break;
            case 'addLocal':
                await this.addModel(type, 'local');
                break;
            case 'addExternal':
                await this.addModel(type, 'external');
                break;
            case 'addHf':
                await this.addModel(type, 'hf');
                break;
            case 'delete':
                await this.deleteModel(details.modelsList, details.modelsListSettingName);
                break;
            case 'view':
                await this.viewModel(type, details.modelsList);
                break;
            case 'export':
                await this.exportModel(type, details.modelsList);
                break;
            case 'import':
                await this.importModel(details.modelsList, details.modelsListSettingName);
                break;
        }
    }
    getActionMap(type) {
        const typeStr = type.charAt(0).toUpperCase() + type.slice(1);
        return {
            select: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`selectStart${typeStr}Model`]) ?? "",
            deselect: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`deselectStop${typeStr}Model`]) ?? "",
            addLocal: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`addLocal${typeStr}Model`]) ?? "",
            addExternal: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`addExternal${typeStr}Model`]) ?? "",
            addHf: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`add${typeStr}ModelFromHuggingface`]) ?? "",
            view: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`view${typeStr}ModelDetails`]) ?? "",
            delete: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`delete${typeStr}Model`]) ?? "",
            export: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`export${typeStr}Model`]) ?? "",
            import: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS[`import${typeStr}Model`]) ?? "",
        };
    }
    async selectStartModel(model, type, details) {
        await this.addApiKey(model);
        this.app.menu.setSelectedModel(type, model);
        await details.killCmd();
        if (model.localStartCommand)
            await details.shellCmd(this.sanitizeCommand(model.localStartCommand ?? ""));
        await this.app.persistence.setValue(this.getSelectedProp(type), model);
    }
    async addModel(type, kind) {
        const details = this.getTypeDetails(type);
        const strategy = this.strategies[kind];
        if (strategy) {
            await strategy.add(details);
        }
    }
    async deleteModel(modelsList, settingName) {
        const modelsItems = this.getModels(modelsList, "", false);
        const modelItem = await vscode.window.showQuickPick(modelsItems);
        if (modelItem) {
            let modelIndex = parseInt(modelItem.label.split(". ")[0], 10) - 1;
            const shouldDeleteModel = await utils_1.Utils.confirmAction("Are you sure you want to delete the model below?", this.getDetails(modelsList[modelIndex]));
            if (shouldDeleteModel) {
                modelsList.splice(modelIndex, 1);
                this.app.configuration.updateConfigValue(settingName, modelsList);
                vscode.window.showInformationMessage("The model is deleted.");
            }
        }
    }
    async viewModel(type, modelsList) {
        let allModels = modelsList.concat(lists_1.PREDEFINED_LISTS.get(type));
        let modelsItems = this.getModels(modelsList, "", false);
        modelsItems = modelsItems.concat(this.getModels(lists_1.PREDEFINED_LISTS.get(type), "(predefined) ", false, modelsList.length));
        let modelItem = await vscode.window.showQuickPick(modelsItems);
        if (modelItem) {
            let modelIndex = parseInt(modelItem.label.split(". ")[0], 10) - 1;
            let selectedModel = allModels[modelIndex];
            await this.showModelDetails(selectedModel);
        }
    }
    async showModelDetails(model) {
        await utils_1.Utils.showOkDialog("Model details: " + this.getDetails(model));
    }
    async exportModel(type, modelsList) {
        let allModels = modelsList.concat(lists_1.PREDEFINED_LISTS.get(type));
        let modelsItems = this.getModels(modelsList, "", false);
        modelsItems = modelsItems.concat(this.getModels(lists_1.PREDEFINED_LISTS.get(type), "(predefined) ", false, modelsList.length));
        let modelItem = await vscode.window.showQuickPick(modelsItems);
        if (modelItem) {
            let modelIndex = parseInt(modelItem.label.split(". ")[0], 10) - 1;
            let selectedModel = allModels[modelIndex];
            let shouldExport = await utils_1.Utils.showYesNoDialog("Do you want to export the following model? \n\n" +
                this.getDetails(selectedModel));
            if (shouldExport) {
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath || '', selectedModel.name + '.json')),
                    filters: {
                        'Model Files': ['json'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Export Model'
                });
                if (uri) {
                    const jsonContent = JSON.stringify(selectedModel, null, 2);
                    fs.writeFileSync(uri.fsPath, jsonContent, 'utf8');
                    vscode.window.showInformationMessage("Model is saved.");
                }
            }
        }
    }
    async importModel(modelList, settingName) {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Import Model',
            filters: {
                'Model Files': ['json'],
                'All Files': ['*']
            },
        });
        if (!uris || uris.length === 0) {
            return;
        }
        const filePath = uris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const newModel = JSON.parse(fileContent);
        // Sanitize imported model
        if (newModel.name)
            newModel.name = this.sanitizeInput(newModel.name);
        if (newModel.localStartCommand)
            newModel.localStartCommand = this.sanitizeCommand(newModel.localStartCommand);
        if (newModel.endpoint)
            newModel.endpoint = this.sanitizeInput(newModel.endpoint);
        if (newModel.aiModel)
            newModel.aiModel = this.sanitizeInput(newModel.aiModel);
        const modelDetails = this.getDetails(newModel);
        const shouldAddModel = await utils_1.Utils.confirmAction("A new model will be added. Do you want to add the model?", modelDetails);
        if (shouldAddModel) {
            modelList.push(newModel);
            this.app.configuration.updateConfigValue(settingName, modelList);
            vscode.window.showInformationMessage("The model is added.");
        }
        vscode.window.showInformationMessage("Model imported: " + newModel.name);
    }
    async deselectModel(type, details) {
        await details.killCmd();
        this.app.menu.clearModel(type);
    }
    getDetails(model) {
        return "name: " + model.name +
            "\nlocal start command: " + model.localStartCommand +
            "\nendpoint: " + model.endpoint +
            "\nmodel name for provider: " + model.aiModel +
            "\napi key required: " + model.isKeyRequired;
    }
    getModels(models, prefix, hasDetails, lastModelNumber = 0) {
        const modelsItems = [];
        let i = lastModelNumber;
        for (let model of models) {
            i++;
            if (hasDetails) {
                modelsItems.push({
                    label: i + ". " + prefix + model.name,
                    description: model.localStartCommand,
                    detail: "Selects the model" + (model.localStartCommand ? ", downloads the model (if not yet done) and starts a llama-server with it." : "")
                });
            }
            else {
                modelsItems.push({
                    label: i + ". " + prefix + model.name,
                    description: model.localStartCommand
                });
            }
        }
        return modelsItems;
    }
    getTypeDetails(type) {
        const config = constants_1.MODEL_TYPE_CONFIG[type];
        return {
            modelsList: this.app.configuration[config.settingName],
            modelsListSettingName: config.settingName,
            newModelPort: this.app.configuration[config.portSetting],
            newModelHost: this.app.configuration[config.hostSetting],
            selModelPropName: config.propName,
            launchSettingName: config.launchSetting,
            killCmd: this.app.llamaServer[config.killCmdName],
            shellCmd: this.app.llamaServer[config.shellCmdName]
        };
    }
    getSelectedProp(type) {
        const propMap = {
            [constants_1.ModelType.Completion]: constants_1.MODEL_TYPE_CONFIG[constants_1.ModelType.Completion].propName,
            [constants_1.ModelType.Chat]: constants_1.MODEL_TYPE_CONFIG[constants_1.ModelType.Chat].propName,
            [constants_1.ModelType.Embeddings]: constants_1.MODEL_TYPE_CONFIG[constants_1.ModelType.Embeddings].propName,
            [constants_1.ModelType.Tools]: constants_1.MODEL_TYPE_CONFIG[constants_1.ModelType.Tools].propName
        };
        return propMap[type] || '';
    }
    async addApiKey(model) {
        if (model.isKeyRequired) {
            const apiKey = this.app.persistence.getApiKey(model.endpoint ?? "");
            if (!apiKey) {
                let result = await vscode.window.showInputBox({
                    placeHolder: 'Enter your api key for ' + model.endpoint,
                    prompt: 'your api key for ' + model.endpoint,
                    value: ''
                });
                result = this.sanitizeInput(result || '');
                if (result) {
                    this.app.persistence.setApiKey(model.endpoint ?? "", result);
                    vscode.window.showInformationMessage("Your API key for " + model.endpoint + " was saved.");
                }
            }
        }
    }
    sanitizeInput(input) {
        return input ? input.trim() : '';
    }
}
exports.ModelService = ModelService;
//# sourceMappingURL=model-service.js.map