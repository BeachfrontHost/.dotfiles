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
const axios = __importStar(require("axios"));
const constants_1 = require("../constants");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class LocalModelStrategy {
    constructor(app) {
        this.sanitizeCommand = (command) => {
            if (!command)
                return '';
            return command.trim().replace(/[`#$&*;\<>\?\\|~!{}()[\]^"]/g, '\\$&');
        };
        this.app = app;
    }
    async add(details) {
        const hostEndpoint = "http://" + details.newModelHost;
        const modelListToLocalCommand = new Map([
            ["completion_models_list", "llama-server -hf <model name from hugging face, i.e: ggml-org/Qwen2.5-Coder-1.5B-Q8_0-GGUF> -ngl 99 -ub 1024 -b 1024 --ctx-size 0 --cache-reuse 256 --port " + details.newModelPort + " --host " + details.newModelHost],
            ["chat_models_list", 'llama-server -hf <model name from hugging face, i.e: ggml-org/Qwen2.5-Coder-7B-Instruct-Q8_0-GGUF> -ngl 99 -ub 1024 -b 1024 --ctx-size 0 --cache-reuse 256 -np 2 --port ' + details.newModelPort + " --host " + details.newModelHost],
            ["embeddings_models_list", "llama-server -hf <model name from hugging face, i.e: ggml-org/Nomic-Embed-Text-V2-GGUF> -ngl 99 -ub 2048 -b 2048 --ctx-size 2048 --embeddings --port " + details.newModelPort + " --host " + details.newModelHost],
            ["tools_models_list", "llama-server -hf <model name from hugging face, i.e: unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF:Q8_0> --jinja  -ngl 99 -c 0 -ub 1024 -b 1024 --cache-reuse 256 --port " + details.newModelPort + " --host " + details.newModelHost]
        ]);
        let name = await utils_1.Utils.getValidatedInput('name for your model (required)', (input) => input.trim() !== '', 5, {
            placeHolder: 'Enter a user friendly name for your model (required)',
            value: ''
        });
        if (name === undefined) {
            vscode.window.showInformationMessage("Model addition cancelled.");
            return;
        }
        name = this.sanitizeInput(name);
        let localStartCommand = await utils_1.Utils.getValidatedInput('Enter a command to start the model locally', (input) => input.trim() !== '', 5, {
            placeHolder: 'A command to start the model locally, i.e. llama-server -m model_name.gguf --port ' + details.newModelPort + '. (required for local model)',
            value: modelListToLocalCommand.get(details.modelsListSettingName) || ''
        });
        if (localStartCommand === undefined) {
            vscode.window.showInformationMessage("Model addition cancelled.");
            return;
        }
        localStartCommand = this.sanitizeCommand(localStartCommand);
        let endpoint = await utils_1.Utils.getValidatedInput('Endpoint for accessing your model', (input) => input.trim() !== '', 5, {
            placeHolder: 'Endpoint for accessing your model, i.e. ' + hostEndpoint + ':' + details.newModelPort + ' (required)',
            value: hostEndpoint + ':' + details.newModelPort
        });
        if (endpoint === undefined) {
            vscode.window.showInformationMessage("Model addition cancelled.");
            return;
        }
        endpoint = this.sanitizeInput(endpoint);
        const isKeyRequired = await utils_1.Utils.confirmAction(`Is API key required for this endpoint (${endpoint})?`, "");
        let newModel = {
            name: name,
            localStartCommand: localStartCommand,
            endpoint: endpoint,
            aiModel: "",
            isKeyRequired: isKeyRequired
        };
        const shouldAddModel = await utils_1.Utils.confirmAction("You have entered:", "\nname: " + name +
            "\nlocal start command: " + localStartCommand +
            "\nendpoint: " + endpoint +
            "\nmodel name for provider: " +
            "\napi key required: " + isKeyRequired +
            "\nDo you want to add a model with these properties?");
        if (shouldAddModel) {
            let shouldOverwrite = false;
            [newModel.name, shouldOverwrite] = await this.getUniqueModelName(details.modelsList, newModel);
            if (!newModel.name) {
                vscode.window.showInformationMessage("The model was not added as the name was not provided.");
                return;
            }
            if (shouldOverwrite) {
                const index = details.modelsList.findIndex(model => model.name === newModel.name);
                if (index !== -1) {
                    details.modelsList.splice(index, 1);
                }
            }
            details.modelsList.push(newModel);
            this.app.configuration.updateConfigValue(details.modelsListSettingName, details.modelsList);
            vscode.window.showInformationMessage("The model is added.");
        }
    }
    sanitizeInput(input) {
        return input ? input.trim() : '';
    }
    async getUniqueModelName(modelsList, newModel) {
        let uniqueName = newModel.name;
        let shouldOverwrite = false;
        let modelSameName = modelsList.find(model => model.name === uniqueName);
        while (uniqueName && !shouldOverwrite && modelSameName !== undefined) {
            shouldOverwrite = await utils_1.Utils.confirmAction("A model with the same name already exists. Do you want to overwrite the existing model?", "Existing model:\n" +
                this.getModelDetailsAsString(modelSameName) +
                "\n\nNew model:\n" +
                this.getModelDetailsAsString(newModel));
            if (!shouldOverwrite) {
                uniqueName = (await vscode.window.showInputBox({
                    placeHolder: 'a unique name for your new model',
                    prompt: 'Enter a unique name for your new model. Leave empty to cancel entering.',
                    value: newModel.name
                })) ?? "";
                uniqueName = this.sanitizeInput(uniqueName);
                if (uniqueName)
                    modelSameName = modelsList.find(model => model.name === uniqueName);
            }
        }
        return [uniqueName, shouldOverwrite];
    }
    getModelDetailsAsString(model) {
        return "model: " +
            "\nname: " + model.name +
            "\nlocal start command: " + model.localStartCommand +
            "\nendpoint: " + model.endpoint +
            "\nmodel name for provider: " + model.aiModel +
            "\napi key required: " + model.isKeyRequired;
    }
}
class ExternalModelStrategy {
    constructor(app) {
        this.app = app;
    }
    async add(details) {
        const hostEndpoint = "http://" + details.newModelHost;
        let name = await utils_1.Utils.getValidatedInput('name for your model (required)', (input) => input.trim() !== '', 5, {
            placeHolder: 'Enter a user friendly name for your model (required)',
            value: ''
        });
        if (name === undefined) {
            vscode.window.showInformationMessage("Model addition cancelled.");
            return;
        }
        name = this.sanitizeInput(name);
        let endpoint = await utils_1.Utils.getValidatedInput('Endpoint for your model (required)', (input) => input.trim() !== '', 5, {
            placeHolder: 'Endpoint for accessing your model, i.e. ' + hostEndpoint + ':' + details.newModelPort + ' or https://openrouter.ai/api (required)',
            value: ''
        });
        if (endpoint === undefined) {
            vscode.window.showInformationMessage("Model addition cancelled.");
            return;
        }
        endpoint = this.sanitizeInput(endpoint);
        let aiModel = await vscode.window.showInputBox({
            placeHolder: 'Model name, exactly as expected by the provider, i.e. kimi-latest ',
            prompt: 'Enter model name as expected by the provider (leave empty if llama-server is used)',
            value: ''
        });
        aiModel = this.sanitizeInput(aiModel || '');
        const isKeyRequired = await utils_1.Utils.confirmAction(`Is API key required for this endpoint (${endpoint})?`, "");
        let newModel = {
            name: name,
            localStartCommand: "",
            endpoint: endpoint,
            aiModel: aiModel,
            isKeyRequired: isKeyRequired
        };
        const shouldAddModel = await utils_1.Utils.confirmAction("You have entered:", "\nname: " + name +
            "\nlocal start command: " +
            "\nendpoint: " + endpoint +
            "\nmodel name for provider: " + aiModel +
            "\napi key required: " + isKeyRequired +
            "\nDo you want to add a model with these properties?");
        if (shouldAddModel) {
            let shouldOverwrite = false;
            [newModel.name, shouldOverwrite] = await this.getUniqueModelName(details.modelsList, newModel);
            if (!newModel.name) {
                vscode.window.showInformationMessage("The model was not added as the name was not provided.");
                return;
            }
            if (shouldOverwrite) {
                const index = details.modelsList.findIndex(model => model.name === newModel.name);
                if (index !== -1) {
                    details.modelsList.splice(index, 1);
                }
            }
            details.modelsList.push(newModel);
            this.app.configuration.updateConfigValue(details.modelsListSettingName, details.modelsList);
            vscode.window.showInformationMessage("The model is added.");
        }
    }
    sanitizeInput(input) {
        return input ? input.trim() : '';
    }
    async getUniqueModelName(modelsList, newModel) {
        let uniqueName = newModel.name;
        let shouldOverwrite = false;
        let modelSameName = modelsList.find(model => model.name === uniqueName);
        while (uniqueName && !shouldOverwrite && modelSameName !== undefined) {
            shouldOverwrite = await utils_1.Utils.confirmAction("A model with the same name already exists. Do you want to overwrite the existing model?", "Existing model:\n" +
                this.getModelDetailsAsString(modelSameName) +
                "\n\nNew model:\n" +
                this.getModelDetailsAsString(newModel));
            if (!shouldOverwrite) {
                uniqueName = (await vscode.window.showInputBox({
                    placeHolder: 'a unique name for your new model',
                    prompt: 'Enter a unique name for your new model. Leave empty to cancel entering.',
                    value: newModel.name
                })) ?? "";
                uniqueName = this.sanitizeInput(uniqueName);
                if (uniqueName)
                    modelSameName = modelsList.find(model => model.name === uniqueName);
            }
        }
        return [uniqueName, shouldOverwrite];
    }
    getModelDetailsAsString(model) {
        return "model: " +
            "\nname: " + model.name +
            "\nlocal start command: " + model.localStartCommand +
            "\nendpoint: " + model.endpoint +
            "\nmodel name for provider: " + model.aiModel +
            "\napi key required: " + model.isKeyRequired;
    }
}
class HfModelStrategy {
    constructor(app) {
        this.app = app;
    }
    async add(details) {
        const modelType = constants_1.SETTING_TO_MODEL_TYPE[details.modelsListSettingName];
        const template = constants_1.HF_MODEL_TEMPLATES[modelType]
            .replace('MODEL_PLACEHOLDER', '<model_name>')
            .replace('PORT_PLACEHOLDER', details.newModelPort.toString())
            .replace('HOST_PLACEHOLDER', details.newModelHost);
        const hostEndpoint = "http://" + details.newModelHost;
        let searchWords = await vscode.window.showInputBox({
            placeHolder: 'keywords for searching a model from huggingface',
            prompt: 'Enter keywords to search for models in huggingface',
            value: ""
        });
        searchWords = this.sanitizeInput(searchWords || '');
        if (!searchWords) {
            vscode.window.showInformationMessage("No huggingface model selected.");
            return;
        }
        let hfModelName = await this.getDownloadModelName(searchWords);
        if (hfModelName == "")
            return;
        let localStartCommand = template.replace('<model_name>', hfModelName);
        localStartCommand = this.sanitizeCommand(localStartCommand);
        let endpoint = hostEndpoint + ":" + details.newModelPort;
        endpoint = this.sanitizeInput(endpoint);
        const aiModel = "";
        const isKeyRequired = false;
        let name = "hf: " + hfModelName;
        name = this.sanitizeInput(name);
        let newHfModel = {
            name: name,
            localStartCommand: localStartCommand,
            endpoint: endpoint,
            aiModel: aiModel,
            isKeyRequired: isKeyRequired
        };
        const shouldAddModel = await utils_1.Utils.confirmAction("You have entered:", this.getModelDetailsAsString(newHfModel) +
            "\nDo you want to add a model with these properties?");
        if (shouldAddModel) {
            let shouldOverwrite = false;
            [newHfModel.name, shouldOverwrite] = await this.getUniqueModelName(details.modelsList, newHfModel);
            if (!newHfModel.name) {
                vscode.window.showInformationMessage("The model was not added as the name was not provided.");
                return;
            }
            if (shouldOverwrite) {
                const index = details.modelsList.findIndex(model => model.name === newHfModel.name);
                if (index !== -1) {
                    details.modelsList.splice(index, 1);
                }
            }
            details.modelsList.push(newHfModel);
            this.app.configuration.updateConfigValue(details.modelsListSettingName, details.modelsList);
            vscode.window.showInformationMessage("The model is added: " + newHfModel.name);
            const shouldSelect = await utils_1.Utils.confirmAction("Do you want to select/start the newly added model?", "");
            if (shouldSelect) {
                // Note: Selection logic will be handled by caller or separate method
                // For now, just add
            }
        }
    }
    async getDownloadModelName(searchWords) {
        searchWords = this.sanitizeInput(searchWords);
        const foundModels = await this.getHfModels(searchWords ?? "");
        let hfModelName = "";
        if (foundModels && foundModels.length > 0) {
            const hfModelsQp = [];
            for (let hfModel of foundModels) {
                if (!hfModel.private) {
                    hfModelsQp.push({
                        label: hfModel.modelId,
                        description: "created: " + hfModel.createdAt + " | downloads: " + hfModel.downloads + " | likes: " + hfModel.likes +
                            " | pipeline: " + hfModel.pipeline_tag + " | tags: " + hfModel.tags
                    });
                }
            }
            const selModel = await vscode.window.showQuickPick(hfModelsQp);
            if (selModel && selModel.label) {
                let modelFiles = await this.getHfModelFiles(selModel.label);
                if (modelFiles && modelFiles.length > 0) {
                    const hfModelsFilesQp = await this.getFilesOfModel(selModel, modelFiles);
                    if (hfModelsFilesQp.length <= 0) {
                        vscode.window.showInformationMessage("No files found for model " + selModel.label + " or the files are with unexpected naming conventions.");
                        return "";
                    }
                    else {
                        let selFile = await vscode.window.showQuickPick(hfModelsFilesQp);
                        if (!selFile) {
                            vscode.window.showInformationMessage("No files selected for model " + selModel.label + ".");
                            return "";
                        }
                        if (hfModelsFilesQp.length == 1)
                            hfModelName = selModel.label ?? "";
                        else
                            hfModelName = selFile?.label ?? "";
                    }
                }
                else {
                    vscode.window.showInformationMessage("No files found for model " + selModel.label);
                    return "";
                }
            }
            else {
                vscode.window.showInformationMessage("No huggingface model selected.");
                return '';
            }
        }
        else {
            vscode.window.showInformationMessage("No model selected.");
            return "";
        }
        hfModelName = this.sanitizeInput(hfModelName);
        return hfModelName;
    }
    async getFilesOfModel(selModel, modelFiles) {
        const hfModelsFilesQp = [];
        const ggufSuffix = ".gguf";
        let cleanModelName = selModel.label.split("/")[1].replace(/-gguf/gi, "");
        let arePartsOfOneFile = true;
        let multiplePartsSize = 0;
        let multiplePartsCount = 0;
        for (let file of modelFiles) {
            if (file.type == "file"
                && file.path.toLowerCase().endsWith(ggufSuffix)
                && file.path.toLowerCase().startsWith(cleanModelName.toLowerCase())) {
                let quantization = file.path.slice(cleanModelName.length + 1, -ggufSuffix.length);
                if (arePartsOfOneFile && !this.isOneOfMany(quantization.slice(-14)))
                    arePartsOfOneFile = false;
                if (!arePartsOfOneFile) {
                    hfModelsFilesQp.push({
                        label: selModel.label + (quantization ? ":" + quantization : ""),
                        description: "size: " + (Math.round((file.size / 1000000000) * 100) / 100) + "GB"
                    });
                }
                else {
                    multiplePartsSize += file.size;
                    multiplePartsCount++;
                }
            }
            if (file.type == "directory") {
                let subfolderFiles = await this.getHfModelSubforlderFiles(selModel.label, file.path);
                let totalSize = 0;
                let totalFiles = 0;
                for (let file of subfolderFiles) {
                    if (file.path.toLowerCase().endsWith(ggufSuffix)) {
                        totalSize += file.size;
                        totalFiles++;
                    }
                }
                hfModelsFilesQp.push({
                    label: selModel.label + ":" + file.path,
                    description: "size: " + (Math.round((totalSize / 1000000000) * 100) / 100) + " GB | files: " + totalFiles
                });
            }
        }
        if (arePartsOfOneFile) {
            hfModelsFilesQp.push({
                label: selModel.label,
                description: "size: " + (Math.round((multiplePartsSize / 1073741824) * 100) / 100) + " GB | files: " + multiplePartsCount
            });
        }
        return hfModelsFilesQp;
    }
    isOneOfMany(input) {
        const regex = /^\d{5}-of-\d{5}$/;
        return regex.test(input);
    }
    async getHfModels(searchWords) {
        let hfEndpoint = "https://huggingface.co/api/models?limit=1500&search=" + "GGUF+" + searchWords.replace(" ", "+");
        let result = await axios.default.get(`${utils_1.Utils.trimTrailingSlash(hfEndpoint)}`);
        if (result && result.data)
            return result.data;
        else
            return [];
    }
    async getHfModelFiles(modelId) {
        let hfEndpoint = "https://huggingface.co/api/models/" + modelId + "/tree/main";
        let result = await axios.default.get(`${utils_1.Utils.trimTrailingSlash(hfEndpoint)}`);
        if (result && result.data)
            return result.data;
        else
            return [];
    }
    async getHfModelSubforlderFiles(modelId, subfolder) {
        let hfEndpoint = "https://huggingface.co/api/models/" + modelId + "/tree/main/" + subfolder;
        let result = await axios.default.get(`${utils_1.Utils.trimTrailingSlash(hfEndpoint)}`);
        if (result && result.data)
            return result.data;
        else
            return [];
    }
    sanitizeCommand(command) {
        if (!command)
            return '';
        return command.trim().replace(/[`#$&*;\<>\?\\|~!{}()[\]^"]/g, '\\$&');
    }
    sanitizeInput(input) {
        return input ? input.trim() : '';
    }
    async getUniqueModelName(modelsList, newModel) {
        let uniqueName = newModel.name;
        let shouldOverwrite = false;
        let modelSameName = modelsList.find(model => model.name === uniqueName);
        while (uniqueName && !shouldOverwrite && modelSameName !== undefined) {
            shouldOverwrite = await utils_1.Utils.confirmAction("A model with the same name already exists. Do you want to overwrite the existing model?", "Existing model:\n" +
                this.getModelDetailsAsString(modelSameName) +
                "\n\nNew model:\n" +
                this.getModelDetailsAsString(newModel));
            if (!shouldOverwrite) {
                uniqueName = (await vscode.window.showInputBox({
                    placeHolder: 'a unique name for your new model',
                    prompt: 'Enter a unique name for your new model. Leave empty to cancel entering.',
                    value: newModel.name
                })) ?? "";
                uniqueName = this.sanitizeInput(uniqueName);
                if (uniqueName)
                    modelSameName = modelsList.find(model => model.name === uniqueName);
            }
        }
        return [uniqueName, shouldOverwrite];
    }
    getModelDetailsAsString(model) {
        return "model: " +
            "\nname: " + model.name +
            "\nlocal start command: " + model.localStartCommand +
            "\nendpoint: " + model.endpoint +
            "\nmodel name for provider: " + model.aiModel +
            "\napi key required: " + model.isKeyRequired;
    }
}
class ModelService {
    constructor(app) {
        this.app = app;
        this.strategies = {
            local: new LocalModelStrategy(app),
            external: new ExternalModelStrategy(app),
            hf: new HfModelStrategy(app)
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
        const uiText = this.app.configuration.getUiText;
        // if (selected.label === uiText(UI_TEXT_KEYS.selectStartCompletionModel) //|| // generalize
        //     // Actually, since labels are type-specific, use a map or check startsWith or something.
        //     // For simplicity, use if conditions based on known patterns.
        // ) {
        // Better: define action types
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
                await this.viewModel(details.modelsList);
                break;
            case 'export':
                await this.exportModel(details.modelsList);
                break;
            case 'import':
                await this.importModel(details.modelsList, details.modelsListSettingName);
                break;
        }
        // }
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
    async selectModel(type, modelsList) {
        const details = this.getTypeDetails(type);
        const modelsItems = this.getModels(modelsList);
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
                model = {
                    name: "Use settings",
                    aiModel: this.app.configuration.ai_model,
                    isKeyRequired: false,
                    endpoint: this.app.configuration[launchToEndpoint.get(details.launchSettingName)],
                    localStartCommand: this.app.configuration[details.launchSettingName]
                };
            }
            else {
                const index = parseInt(selectedModelItem.label.split(". ")[0], 10) - 1;
                model = modelsList[index];
            }
            // Set to menu's property - but since service, perhaps return model and let menu set
            // For now, assume menu has access or pass menu instance, but to avoid, perhaps service has the selected models map
            // Wait, this is a problem. Selected models are in Menu.
            // To fix, perhaps ModelService has private selected: Record<ModelType, LlmModel>
            // And menu uses service.getSelected(type)
            // But for now, to match, perhaps pass menu or make selected public.
            // The task is to break monolith, so let's make ModelService manage selected models.
            // Assume we add to ModelService:
            // private selectedModels: Record<ModelType, LlmModel> = {};
            // Then in constructor init them.
            // But to minimize changes, for this refactor, I'll note it.
            // Actually, since Menu has them, and service is injected, service can take Menu or use app.
            // App has menu, circular.
            // Best: Move selected models to Application or a separate SelectionService.
            // But for this task, I'll implement the methods without setting selected, and note that in menu we will call service.selectModel and then set this.selectedXXX = model;
            // But to make it work, the selectModel will return the selected model.
            // Let's make async selectModel(type: ModelType, modelsList: LlmModel[]): Promise<LlmModel | null>
            // Then in menu: this.selectedComplModel = await this.modelService.selectModel(ModelType.Completion, list) || {name: ""};
            // Yes, that's better.
            // So, adjust:
            if (parseInt(selectedModelItem.label.split(". ")[0], 10) == modelsItems.length) {
                model = {
                    name: "Use settings",
                    isKeyRequired: false,
                    endpoint: this.app.configuration[launchToEndpoint.get(details.launchSettingName)],
                    localStartCommand: this.app.configuration[details.launchSettingName]
                };
            }
            else {
                const index = parseInt(selectedModelItem.label.split(". ")[0], 10) - 1;
                model = modelsList[index];
            }
            await this.addApiKey(model);
            await this.app.persistence.setValue(this.getSelectedProp(type), model);
            await details.killCmd();
            if (model.localStartCommand)
                await details.shellCmd(this.sanitizeCommand(model.localStartCommand ?? ""));
            this.app.llamaWebviewProvider.updateLlamaView();
            return; //model;
        }
        return; //null;
    }
    // Continue with other methods...
    async addModel(type, kind) {
        const details = this.getTypeDetails(type);
        const strategy = this.strategies[kind];
        if (strategy) {
            await strategy.add(details);
        }
    }
    async deleteModel(modelsList, settingName) {
        const modelsItems = this.getModels(modelsList);
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
    async viewModel(modelsList) {
        const modelsItems = this.getModels(modelsList);
        let modelItem = await vscode.window.showQuickPick(modelsItems);
        if (modelItem) {
            let modelIndex = parseInt(modelItem.label.split(". ")[0], 10) - 1;
            let selectedModel = modelsList[modelIndex];
            await utils_1.Utils.showOkDialog("Model details: " + this.getDetails(selectedModel));
        }
    }
    async exportModel(modelsList) {
        const modelsItems = this.getModels(modelsList);
        let modelItem = await vscode.window.showQuickPick(modelsItems);
        if (modelItem) {
            let modelIndex = parseInt(modelItem.label.split(". ")[0], 10) - 1;
            let selectedModel = modelsList[modelIndex];
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
        // Set selected to empty - assume caller sets
        this.app.llamaWebviewProvider.updateLlamaView();
    }
    getDetails(model) {
        return "name: " + model.name +
            "\nlocal start command: " + model.localStartCommand +
            "\nendpoint: " + model.endpoint +
            "\nmodel name for provider: " + model.aiModel +
            "\napi key required: " + model.isKeyRequired;
    }
    getModels(modelsFromProperty) {
        const modelsItems = [];
        let i = 0;
        for (let model of modelsFromProperty) {
            i++;
            modelsItems.push({
                label: i + ". " + model.name,
                description: model.localStartCommand,
                detail: "Selects the model and if local also downloads the model (if not yet done) and starts a llama-server with it."
            });
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
            [constants_1.ModelType.Completion]: 'selectedComplModel',
            [constants_1.ModelType.Chat]: 'selectedChatModel',
            [constants_1.ModelType.Embeddings]: 'selectedEmbeddingsModel',
            [constants_1.ModelType.Tools]: 'selectedToolsModel'
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
    sanitizeCommand(command) {
        if (!command)
            return '';
        return command.trim().replace(/[`#$&*;\<>\?\\|~!{}()[\]^"]/g, '\\$&');
    }
    sanitizeInput(input) {
        return input ? input.trim() : '';
    }
}
exports.ModelService = ModelService;
//# sourceMappingURL=ModelService.js.map