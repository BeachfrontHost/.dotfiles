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
exports.AgentService = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lists_1 = require("../lists");
const constants_1 = require("../constants");
class AgentService {
    constructor(app) {
        this.app = app;
    }
    getActions() {
        return [
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartAgent) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopAgent) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAgent) ?? "",
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewAgentDetails) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteAgent) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportAgent) ?? ""
            },
            {
                label: this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importAgent) ?? ""
            },
        ];
    }
    async processActions(selected) {
        switch (selected.label) {
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.selectStartAgent):
                await this.pickAndSelectAgent(this.app.configuration.agents_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.addAgent):
                await this.addAgent(this.app.configuration.agents_list, constants_1.SETTING_NAME_FOR_LIST.AGENTS);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deleteAgent):
                await this.deleteAgent(this.app.configuration.agents_list, constants_1.SETTING_NAME_FOR_LIST.AGENTS);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.viewAgentDetails):
                await this.viewAgent(this.app.configuration.agents_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.deselectStopAgent):
                await this.deselectAgent();
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.exportAgent):
                await this.exportAgent(this.app.configuration.agents_list);
                break;
            case this.app.configuration.getUiText(constants_1.UI_TEXT_KEYS.importAgent):
                await this.importAgent(this.app.configuration.agents_list, constants_1.SETTING_NAME_FOR_LIST.AGENTS);
                break;
        }
    }
    async pickAndSelectAgent(agentsList) {
        let allAgents = agentsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS));
        let agentsItems = this.getStandardQpList(agentsList, "");
        agentsItems = agentsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS), "(predefined) ", agentsList.length));
        let lastUsedAgent = this.app.persistence.getValue(constants_1.PERSISTENCE_KEYS.SELECTED_AGENT);
        if (lastUsedAgent && lastUsedAgent.name.trim() !== "") {
            agentsItems.push({ label: (agentsItems.length + 1) + ". Last used agent", description: lastUsedAgent.name });
        }
        const agentItem = await vscode.window.showQuickPick(agentsItems);
        if (agentItem) {
            let selectedAgent;
            if (agentItem.label.includes("Last used agent")) {
                selectedAgent = lastUsedAgent;
            }
            else {
                const index = parseInt(agentItem.label.split(". ")[0], 10) - 1;
                selectedAgent = allAgents[index];
            }
            if (selectedAgent) {
                await this.selectAgent(selectedAgent);
                vscode.window.showInformationMessage(`Agent is selected:  ${selectedAgent.name}`);
                return selectedAgent;
            }
        }
        return undefined;
    }
    async selectAgent(agent) {
        this.app.menu.setSelectedAgent(agent);
        const allTools = Array.from(this.app.tools.toolsFunc.keys());
        for (let toolName of allTools) {
            this.app.configuration.updateConfigValue(`tool_${toolName}_enabled`, agent.tools?.includes(toolName) ?? false);
        }
        await this.app.persistence.setValue(constants_1.PERSISTENCE_KEYS.SELECTED_AGENT, agent);
        this.app.llamaWebviewProvider.updateLlamaView();
        if (agent.name.trim() !== "") {
            vscode.window.showInformationMessage(`Agent ${agent.name} is selected.`);
        }
    }
    async deselectAgent() {
        const emptyAgent = { name: "", systemInstruction: [] };
        this.app.menu.setSelectedAgent(emptyAgent);
        const allTools = Array.from(this.app.tools.toolsFunc.keys());
        for (let toolName of allTools) {
            this.app.configuration.updateConfigValue(`tool_${toolName}_enabled`, true);
        }
        await this.app.persistence.setValue(constants_1.PERSISTENCE_KEYS.SELECTED_AGENT, emptyAgent);
        this.app.llamaWebviewProvider.updateLlamaView();
        vscode.window.showInformationMessage("The agent is deselected.");
    }
    async addAgent(agentsList, settingName) {
        let name = await utils_1.Utils.getValidatedInput('name for your agent (required)', (input) => input.trim() !== '', 5, {
            placeHolder: 'Enter a user friendly name for your agent (required)',
            value: ''
        });
        if (name === undefined) {
            vscode.window.showInformationMessage("Agent addition cancelled.");
            return;
        }
        name = this.app.modelService.sanitizeInput(name);
        let description = await vscode.window.showInputBox({
            placeHolder: 'description for the agent - what is the purpose, when to select etc. ',
            prompt: 'Enter description for the agent.',
            value: ''
        });
        description = this.app.modelService.sanitizeInput(description || '');
        // Collect system instruction lines
        let systemInstruction = [];
        let line;
        do {
            line = await vscode.window.showInputBox({
                placeHolder: 'Enter a line for system instruction (empty to finish)',
                prompt: 'System instruction line',
                value: ''
            });
            if (line && line.trim() !== '') {
                systemInstruction.push(this.app.modelService.sanitizeInput(line));
            }
        } while (line && line.trim() !== '');
        if (systemInstruction.length === 0) {
            vscode.window.showWarningMessage("No system instruction provided. Agent may not function properly.");
        }
        // Select tools
        const availableTools = Array.from(this.app.tools.toolsFunc.keys()).map(tool => ({
            label: tool,
            picked: true // default all
        }));
        const selectedToolsItems = await vscode.window.showQuickPick(availableTools, {
            canPickMany: true,
            placeHolder: 'Select tools for the agent (Ctrl+click to select multiple)'
        });
        const tools = selectedToolsItems ? selectedToolsItems.map(item => item.label) : Array.from(this.app.tools.toolsFunc.keys());
        let newAgent = {
            name: name,
            description: description,
            systemInstruction: systemInstruction,
            tools: tools
        };
        await this.persistAgent(newAgent, agentsList, settingName);
    }
    async persistAgent(newAgent, agentsList, settingName) {
        let agentDetails = this.getAgentDetailsAsString(newAgent);
        const shouldAddAgent = await utils_1.Utils.confirmAction("A new agent will be added. Do you want to add the agent?", agentDetails);
        if (shouldAddAgent) {
            agentsList.push(newAgent);
            this.app.configuration.updateConfigValue(settingName, agentsList);
            vscode.window.showInformationMessage("The agent is added.");
        }
    }
    async deleteAgent(agentsList, settingName) {
        const agentsItems = this.getStandardQpList(agentsList, "");
        const agentItem = await vscode.window.showQuickPick(agentsItems);
        if (agentItem) {
            let agentIndex = parseInt(agentItem.label.split(". ")[0], 10) - 1;
            const shouldDeleteAgent = await utils_1.Utils.confirmAction("Are you sure you want to delete the following agent?", this.getAgentDetailsAsString(agentsList[agentIndex]));
            if (shouldDeleteAgent) {
                agentsList.splice(agentIndex, 1);
                this.app.configuration.updateConfigValue(settingName, agentsList);
                vscode.window.showInformationMessage("The agent is deleted.");
            }
        }
    }
    async viewAgent(agentsList) {
        let allAgents = agentsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS));
        let agentsItems = this.getStandardQpList(agentsList, "");
        agentsItems = agentsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS), "(predefined) ", agentsList.length));
        let agentItem = await vscode.window.showQuickPick(agentsItems);
        if (agentItem) {
            let agentIndex = parseInt(agentItem.label.split(". ")[0], 10) - 1;
            let selectedAgent = allAgents[agentIndex];
            await this.showAgentDetails(selectedAgent);
        }
    }
    async showAgentDetails(selectedAgent) {
        let agentDetails = this.getAgentDetailsAsString(selectedAgent);
        await utils_1.Utils.showOkDialog(agentDetails);
    }
    async exportAgent(agentsList) {
        let allAgents = agentsList.concat(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS));
        let agentsItems = this.getStandardQpList(agentsList, "");
        agentsItems = agentsItems.concat(this.getStandardQpList(lists_1.PREDEFINED_LISTS.get(constants_1.PREDEFINED_LISTS_KEYS.AGENTS), "(predefined) ", agentsList.length));
        let agentItem = await vscode.window.showQuickPick(agentsItems);
        if (agentItem) {
            let agentIndex = parseInt(agentItem.label.split(". ")[0], 10) - 1;
            let selectedAgent = allAgents[agentIndex];
            let shouldExport = await utils_1.Utils.showYesNoDialog("Do you want to export the following agent? \n\n" +
                this.getAgentDetailsAsString(selectedAgent));
            if (shouldExport) {
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath || '', selectedAgent.name + '.json')),
                    filters: {
                        'Agent Files': ['json'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Export Agent'
                });
                if (uri) {
                    const jsonContent = JSON.stringify(selectedAgent, null, 2);
                    fs.writeFileSync(uri.fsPath, jsonContent, 'utf8');
                    vscode.window.showInformationMessage("Agent is saved.");
                }
            }
        }
    }
    async importAgent(agentsList, settingName) {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Import Agent',
            filters: {
                'Agent Files': ['json'],
                'All Files': ['*']
            },
        });
        if (!uris || uris.length === 0) {
            return;
        }
        const filePath = uris[0].fsPath;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let newAgent = JSON.parse(fileContent);
        // Sanitize imported agent
        this.sanitizeAgent(newAgent);
        await this.persistAgent(newAgent, agentsList, settingName);
    }
    sanitizeAgent(agent) {
        if (agent.name)
            agent.name = this.app.modelService.sanitizeInput(agent.name);
        if (agent.description)
            agent.description = this.app.modelService.sanitizeInput(agent.description);
        if (agent.systemInstruction) {
            agent.systemInstruction = agent.systemInstruction.map((s) => this.app.modelService.sanitizeInput(s));
        }
        // tools are strings, no need
    }
    getAgentDetailsAsString(agent) {
        return "Agent details: " +
            "\nname: " + agent.name +
            "\ndescription: " + agent.description +
            "\nsystem prompt: \n" + agent.systemInstruction.join("\n") +
            "\n\ntools: " + (agent.tools ? agent.tools.join(", ") : "");
    }
    getStandardQpList(list, prefix, lastAgentNumber = 0) {
        const items = [];
        let i = lastAgentNumber;
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
exports.AgentService = AgentService;
//# sourceMappingURL=agent-service.js.map