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
exports.LlamaWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const plugin_1 = require("./plugin");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
class LlamaWebviewProvider {
    constructor(_extensionUri, app, context) {
        this._extensionUri = _extensionUri;
        this.app = app;
        this.context = context;
    }
    get webview() {
        return this._webview;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._webview = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.file(path.join(this._extensionUri.fsPath, 'ui', 'dist'))
            ]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('Webview received message:', message);
            switch (message.command) {
                case 'sendText':
                    this.app.llamaAgent.run(message.text);
                    break;
                case 'sendAgentCommand':
                    this.app.llamaAgent.run(message.text, message.agentCommand);
                    break;
                case 'clearText':
                    this.app.llamaAgent.resetMessages();
                    this.app.llamaAgent.resetContextProjectFiles();
                    await this.app.menu.selectUpdateChat({ name: "", id: "" });
                    vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
                        command: 'updateText',
                        text: ''
                    });
                    break;
                case 'showChatsHistory':
                    this.app.menu.selectChatFromList();
                    break;
                case 'configureTools':
                    await this.app.tools.selectTools();
                    break;
                case 'stopSession':
                    this.app.llamaAgent.stopAgent();
                    break;
                case 'selectModelWithTools':
                    await this.app.menu.selectAndSetModel(constants_1.ModelType.Tools, this.app.configuration.tools_models_list);
                    break;
                case 'selectModelForChat':
                    await this.app.menu.selectAndSetModel(constants_1.ModelType.Chat, this.app.configuration.chat_models_list);
                    break;
                case 'selectModelForEmbeddings':
                    await this.app.menu.selectAndSetModel(constants_1.ModelType.Embeddings, this.app.configuration.embeddings_models_list);
                    break;
                case 'selectModelForCompletion':
                    await this.app.menu.selectAndSetModel(constants_1.ModelType.Completion, this.app.configuration.completion_models_list);
                    break;
                case 'deselectCompletionModel':
                    await this.app.menu.deselectAndClearModel(constants_1.ModelType.Completion);
                    break;
                case 'deselectChatModel':
                    await this.app.menu.deselectAndClearModel(constants_1.ModelType.Chat);
                    break;
                case 'deselectEmbsModel':
                    await this.app.menu.deselectAndClearModel(constants_1.ModelType.Embeddings);
                    break;
                case 'deselectToolsModel':
                    await this.app.menu.deselectAndClearModel(constants_1.ModelType.Tools);
                    break;
                case 'deselectAgent':
                    await this.app.agentService.deselectAgent();
                    break;
                case 'showCompletionModel':
                    this.app.modelService.showModelDetails(this.app.menu.getComplModel());
                    break;
                case 'showChatModel':
                    this.app.modelService.showModelDetails(this.app.menu.getChatModel());
                    break;
                case 'showEmbsModel':
                    this.app.modelService.showModelDetails(this.app.menu.getEmbeddingsModel());
                    break;
                case 'showToolsModel':
                    this.app.modelService.showModelDetails(this.app.menu.getToolsModel());
                    break;
                case 'showAgentDetails':
                    this.app.agentService.showAgentDetails(this.app.menu.getAgent());
                    break;
                case 'selectAgent':
                    let agentsList = this.app.configuration.agents_list;
                    await this.app.agentService.pickAndSelectAgent(agentsList);
                    break;
                case 'chatWithAI':
                    this.app.askAi.closeChatWithAi(false);
                    this.app.askAi.showChatWithAi(false, this.context);
                    break;
                case 'installLlamacpp':
                    this.app.menu.installLlamacpp();
                    break;
                case 'addHuggingfaceModel':
                    await this.app.modelService.addModel(constants_1.ModelType.Chat, "hf");
                    break;
                case 'selectEnv':
                    await this.app.envService.selectEnv(this.app.configuration.envs_list, true);
                    break;
                case 'stopEnv':
                    await this.app.envService.stopEnv();
                    break;
                case 'showEnvView':
                    this.app.menu.showEnvView();
                    break;
                case 'showAgentView':
                    this.app.menu.showAgentView();
                    break;
                case 'showSelectedModels':
                    await this.app.menu.showCurrentEnv();
                    break;
                case 'getFileList':
                    let fileKeys;
                    let contextCustom = this.app.configuration.context_custom;
                    if (contextCustom && contextCustom.get_list) {
                        if (fs.existsSync(contextCustom.get_list)) {
                            let toolFunction = await utils_1.Utils.getFunctionFromFile(contextCustom.get_list);
                            fileKeys = toolFunction();
                        }
                        else
                            fileKeys = (await plugin_1.Plugin.execute(contextCustom.get_list));
                    }
                    else {
                        fileKeys = await this.app.chatContext.getProjectFiles();
                    }
                    webviewView.webview.postMessage({
                        command: 'updateFileList',
                        files: fileKeys
                    });
                    break;
                case 'getAgentCommands':
                    let agentCommands = this.app.configuration.agent_commands.map(cmd => cmd.name + " | " + cmd.description);
                    webviewView.webview.postMessage({
                        command: 'updateFileList',
                        files: agentCommands
                    });
                    break;
                case 'addContextProjectFile':
                    let fileNames = message.fileLongName.split("|");
                    this.app.llamaAgent.addContextProjectFile(fileNames[1].trim(), fileNames[0].trim());
                    const contextFiles = this.app.llamaAgent.getContextProjectFiles();
                    webviewView.webview.postMessage({
                        command: 'updateContextFiles',
                        files: Array.from(contextFiles.entries())
                    });
                    break;
                case 'removeContextProjectFile':
                    this.app.llamaAgent.removeContextProjectFile(message.fileLongName);
                    const updatedContextFiles = this.app.llamaAgent.getContextProjectFiles();
                    webviewView.webview.postMessage({
                        command: 'updateContextFiles',
                        files: Array.from(updatedContextFiles.entries())
                    });
                    break;
                case 'openContextFile':
                    const uri = vscode.Uri.file(message.fileLongName);
                    const document = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(document);
                    break;
                case 'addEnv':
                    this.app.envService.addEnv(this.app.configuration.envs_list, constants_1.SETTING_NAME_FOR_LIST.ENVS);
                    break;
                case 'toggleCompletionsEnabled':
                    this.app.configuration.updateConfigValue("enabled", message.enabled);
                    break;
                case 'toggleRagEnabled':
                    this.app.configuration.updateConfigValue("rag_enabled", message.enabled);
                    break;
                case 'toggleAutoStartEnv':
                    this.app.configuration.updateConfigValue("env_start_last_used", message.enabled);
                    break;
                case 'getVscodeSetting':
                    const settingValue = this.app.configuration[message.key];
                    this.updateSettingInEnvView(message.key, settingValue);
                    break;
            }
        });
        // Send initial welcome message when webview is ready
        setTimeout(() => {
            webviewView.webview.postMessage({
                command: 'updateText',
                text: 'Welcome to Llama Agent'
            });
            this.updateLlamaView();
            // Send initial context files
            const contextFiles = this.app.llamaAgent.getContextProjectFiles();
            webviewView.webview.postMessage({
                command: 'updateContextFiles',
                files: Array.from(contextFiles.entries())
            });
        }, 1000);
    }
    updateSettingInEnvView(key, settingValue) {
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'vscodeSettingValue',
            key: key,
            value: settingValue
        });
    }
    updateSettingsInView() {
        this.updateSettingInEnvView('enabled', this.app.configuration.enabled);
        this.updateSettingInEnvView('rag_enabled', this.app.configuration.rag_enabled);
        this.updateSettingInEnvView('env_start_last_used', this.app.configuration.env_start_last_used);
    }
    updateEmbsModel() {
        const currentEmbeddingsModel = this.app.menu.getEmbeddingsModel();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateEmbeddingsModel',
            model: currentEmbeddingsModel.name || 'No model selected'
        });
    }
    updateChatModel() {
        const currentChatModel = this.app.menu.getChatModel();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateChatModel',
            model: currentChatModel.name || 'No model selected'
        });
    }
    updateToolsModel() {
        const currentToolsModel = this.app.menu.getToolsModel();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateToolsModel',
            model: currentToolsModel.name || 'No model selected'
        });
    }
    updateComplsModel() {
        const currentToolsModel = this.app.menu.getComplModel();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateCompletionModel',
            model: currentToolsModel.name || 'No model selected'
        });
    }
    updateAgent() {
        const currentAgent = this.app.menu.getAgent();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateAgent',
            agent: currentAgent.name || 'No agent selected'
        });
    }
    updateEnv() {
        const currentEnv = this.app.menu.getEnv();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateEnv',
            model: currentEnv.name || 'No env selected'
        });
    }
    logInUi(logText) {
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateText',
            text: logText
        });
    }
    setState(stateText) {
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateCurrentState',
            text: stateText
        });
    }
    setView(view) {
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateView',
            text: view
        });
    }
    set(view) {
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateView',
            text: view
        });
    }
    updateLlamaView() {
        this.updateToolsModel();
        this.updateChatModel();
        this.updateEmbsModel();
        this.updateComplsModel();
        this.updateAgent();
        this.updateEnv();
        this.updateSettingsInView();
        this.logInUi(this.app.llamaAgent.getAgentLogText());
    }
    updateContextFilesInfo() {
        const fileKeys = this.app.chatContext.getProjectFiles();
        vscode.commands.executeCommand('llama-vscode.webview.postMessage', {
            command: 'updateContextFiles',
            files: []
        });
    }
    _getHtmlForWebview(webview) {
        // Get the path to the built React app
        const uiPath = path.join(this._extensionUri.fsPath, 'ui', 'dist');
        const indexPath = path.join(uiPath, 'index.html');
        // Check if the React app is built
        if (!fs.existsSync(indexPath)) {
            return this._getErrorHtml('React app not built. Please run "npm run build" in the ui folder.');
        }
        // Read the built HTML file
        let html = fs.readFileSync(indexPath, 'utf8');
        // Update resource paths to use webview.asWebviewUri with proper security
        const bundleUri = webview.asWebviewUri(vscode.Uri.file(path.join(uiPath, 'bundle.js')));
        // Replace the bundle.js reference with the secure URI
        html = html.replace(/src="bundle\.js"/g, `src="${bundleUri}"`);
        return html;
    }
    _getErrorHtml(message) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .error {
                    background-color: #d73a49;
                    color: white;
                    padding: 16px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .instructions {
                    background-color: var(--vscode-input-background);
                    padding: 16px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1>Llama VS Code UI</h1>
            <div class="error">
                <strong>Error:</strong> ${message}
            </div>
            <div class="instructions">
                <h3>To fix this:</h3>
                <ol>
                    <li>Open a terminal in the <code>ui</code> folder</li>
                    <li>Run <code>npm install</code></li>
                    <li>Run <code>npm run build</code></li>
                    <li>Reload the VS Code window</li>
                </ol>
            </div>
        </body>
        </html>`;
    }
}
exports.LlamaWebviewProvider = LlamaWebviewProvider;
LlamaWebviewProvider.viewType = 'llama-vscode.webview';
//# sourceMappingURL=llama-webview-provider.js.map