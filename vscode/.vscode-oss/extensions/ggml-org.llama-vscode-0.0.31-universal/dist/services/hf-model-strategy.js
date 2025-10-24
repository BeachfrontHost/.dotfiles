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
exports.HfModelStrategy = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
const axios = __importStar(require("axios"));
const constants_1 = require("../constants");
class HfModelStrategy {
    constructor(app) {
        this.add = async (details) => {
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
            localStartCommand = this.app.modelService.sanitizeCommand(localStartCommand);
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
                    await this.app.modelService.selectStartModel(newHfModel, modelType, details);
                }
            }
        };
        this.app = app;
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
exports.HfModelStrategy = HfModelStrategy;
//# sourceMappingURL=hf-model-strategy.js.map