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
exports.ExternalModelStrategy = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
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
exports.ExternalModelStrategy = ExternalModelStrategy;
//# sourceMappingURL=external-model-strategy.js.map