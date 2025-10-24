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
exports.LlamaAgent = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const plugin_1 = require("./plugin");
const fs = __importStar(require("fs"));
class LlamaAgent {
    constructor(application) {
        this.lastStopRequestTime = Date.now();
        this.messages = [];
        this.logText = "";
        this.contexProjectFiles = new Map();
        this.sentContextFiles = new Map();
        this.abortController = null;
        this.getAgentLogText = () => this.logText;
        this.resetMessages = () => {
            let systemPromt = this.app.prompts.TOOLS_SYSTEM_PROMPT_ACTION;
            if (this.app.menu.isAgentSelected())
                systemPromt = this.app.menu.getAgent().systemInstruction.join("\n");
            let worspaceFolder = "";
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                worspaceFolder = " Project root folder: " + vscode.workspace.workspaceFolders[0].uri.fsPath;
            }
            let projectContext = "  \n\n" + worspaceFolder;
            if (this.app.configuration.agent_rules && this.app.configuration.agent_rules.trim().length > 0) {
                const absolutePath = utils_1.Utils.getAbsolutFilePath(this.app.configuration.agent_rules);
                if (fs.existsSync(absolutePath)) {
                    projectContext += "  \n\nAdditional rules from the user: \n" + fs.readFileSync(this.app.configuration.agent_rules.trim(), "utf-8");
                }
                else {
                    vscode.window.showErrorMessage(`File with the user defined rules not found: ${this.app.configuration.agent_rules}`);
                }
            }
            else {
                const absolutePath = utils_1.Utils.getAbsolutFilePath("llama-vscode-rules.md");
                if (fs.existsSync(absolutePath))
                    projectContext += "  \n\nAdditional rules from the user: \n" + fs.readFileSync(absolutePath, "utf-8");
            }
            this.messages = [
                {
                    "role": "system",
                    "content": systemPromt + projectContext
                }
            ];
            this.logText = "";
        };
        this.selectChat = (chat) => {
            if (chat && chat.defaultAgent)
                this.app.agentService.selectAgent(chat.defaultAgent);
            this.resetMessages();
            if (chat) {
                const currentChat = this.app.menu.getChat();
                this.messages = chat.messages ?? [];
                this.logText = chat.log ?? "";
            }
            //  this.app.llamaWebviewProvider.logInUi(this.logText);
            this.resetContextProjectFiles();
        };
        this.resetContextProjectFiles = () => {
            this.contexProjectFiles.clear();
            this.app.llamaWebviewProvider.updateContextFilesInfo();
            this.sentContextFiles.clear();
        };
        this.addContextProjectFile = (fileLongName, fileShortName) => {
            this.contexProjectFiles.set(fileLongName, fileShortName);
        };
        this.removeContextProjectFile = (fileLongName) => {
            this.contexProjectFiles.delete(fileLongName);
        };
        this.getContextProjectFiles = () => {
            return this.contexProjectFiles;
        };
        this.run = async (query, agentCommand) => {
            await this.askAgent(query, agentCommand);
        };
        this.askAgent = async (query, agentCommand) => {
            let response = "";
            let toolCallsResult;
            let finishReason = "tool_calls";
            this.logText += "***" + query.replace("\n", "  \n") + "***" + "\n\n"; // Make sure markdown shows new lines correctly
            if (!this.app.menu.isToolsModelSelected()) {
                vscode.window.showErrorMessage("Error: Tools model is not selected! Select tools model (or orchestra with tools model) if you want to to use Llama Agent.");
                this.app.llamaWebviewProvider.setState("AI is stopped");
                return "Tools model is not selected";
            }
            if (this.app.configuration.chats_summarize_old_msgs
                && JSON.stringify(this.messages).length > this.app.configuration.chats_max_tokens * 4) {
                this.summarize();
            }
            if (this.contexProjectFiles.size > 0) {
                query += "\n\nBelow is a context, attached by the user.\n";
                for (const [key, value] of this.contexProjectFiles) {
                    if (this.sentContextFiles.has(key))
                        continue; // send only not sent files (parts)
                    let itemContext;
                    let contextCustom = this.app.configuration.context_custom;
                    if (contextCustom && contextCustom.get_item_context) {
                        if (fs.existsSync(contextCustom.get_item_context)) {
                            let toolFunction = utils_1.Utils.getFunctionFromFile(contextCustom.get_item_context);
                            itemContext = toolFunction(key, value);
                        }
                        else
                            itemContext = (await plugin_1.Plugin.execute(contextCustom.get_item_context, key, value));
                    }
                    else {
                        itemContext = await this.getItemContext(key, value);
                    }
                    query += itemContext;
                    this.sentContextFiles.set(key, value);
                }
            }
            if (agentCommand) {
                const commands = this.app.configuration.agent_commands;
                const commandDetails = commands.find(cmd => cmd.name === agentCommand);
                if (commandDetails)
                    query += "\n\n " + commandDetails.prompt;
            }
            this.messages.push({
                "role": "user",
                "content": query
            });
            let iterationsCount = 0;
            this.app.llamaWebviewProvider.logInUi(this.logText);
            let currentCycleStartTime = Date.now();
            const changedFiles = new Set;
            const deletedFiles = new Set;
            // Create new AbortController for this session
            this.abortController = new AbortController();
            while (iterationsCount < this.app.configuration.tools_max_iterations) {
                if (currentCycleStartTime < this.lastStopRequestTime) {
                    this.app.statusbar.showTextInfo("agent stopped");
                    this.logText += "\n\n" + "Session stopped." + "  \n";
                    this.app.llamaWebviewProvider.logInUi(this.logText);
                    this.app.llamaWebviewProvider.setState("AI is stopped");
                    this.resetMessages();
                    return "agent stopped";
                }
                iterationsCount++;
                try {
                    let streamed = "";
                    let data = await this.app.llamaServer.getAgentCompletion(this.messages, false, (delta) => {
                        streamed += delta;
                        this.logText += delta;
                        this.app.llamaWebviewProvider.logInUi(this.logText);
                    }, this.abortController?.signal);
                    if (!data) {
                        this.logText += "No response from AI" + "  \n";
                        this.app.llamaWebviewProvider.logInUi(this.logText);
                        this.app.llamaWebviewProvider.setState("AI not responding");
                        return "No response from AI";
                    }
                    finishReason = data.choices[0].finish_reason;
                    response = data.choices[0].message.content;
                    if (!streamed && response) {
                        this.logText += response + "  \n";
                    }
                    this.logText += "  \nTotal iterations: " + iterationsCount + "  \n";
                    this.app.llamaWebviewProvider.logInUi(this.logText);
                    if (currentCycleStartTime < this.lastStopRequestTime) {
                        this.app.statusbar.showTextInfo("agent stopped");
                        this.logText += "\n\n" + "Session stopped." + "\n";
                        this.app.llamaWebviewProvider.logInUi(this.logText);
                        this.app.llamaWebviewProvider.setState("AI is stopped");
                        this.resetMessages();
                        return "agent stopped";
                    }
                    this.messages.push(data.choices[0].message);
                    if (finishReason != "tool_calls" && !(data.choices[0].message.tool_calls && data.choices[0].message.tool_calls.length > 0)) {
                        this.logText += "  \n" + "Finish reason: " + finishReason;
                        if (finishReason?.toLowerCase().trim() == "error" && data.choices[0].error)
                            this.logText += "Error: " + data.choices[0].error.message + "  \n";
                        this.app.llamaWebviewProvider.logInUi(this.logText);
                        break;
                    }
                    let toolCalls = data.choices[0].message.tool_calls;
                    if (toolCalls != undefined && toolCalls.length > 0) {
                        for (const oneToolCall of toolCalls) {
                            if (oneToolCall && oneToolCall.function) {
                                this.logText += "  \ntool: " + oneToolCall.function.name + "  \n";
                                if (this.app.configuration.tools_log_calls)
                                    this.logText += "  \narguments: " + oneToolCall.function.arguments;
                                this.app.llamaWebviewProvider.logInUi(this.logText);
                                let commandOutput = "Tool not found";
                                try {
                                    if (this.app.tools.toolsFunc.has(oneToolCall.function.name)) {
                                        const toolFuncDesc = this.app.tools.toolsFuncDesc.get(oneToolCall.function.name);
                                        let commandDescription = "";
                                        if (toolFuncDesc) {
                                            commandDescription = await toolFuncDesc(oneToolCall.function.arguments);
                                            this.logText += commandDescription + "\n\n";
                                            this.app.llamaWebviewProvider.logInUi(this.logText);
                                        }
                                        const toolFunc = this.app.tools.toolsFunc.get(oneToolCall.function.name);
                                        if (toolFunc) {
                                            commandOutput = await toolFunc(oneToolCall.function.arguments);
                                            if (oneToolCall.function.name == "edit_file" && commandOutput != utils_1.Utils.MSG_NO_UESR_PERMISSION)
                                                changedFiles.add(commandDescription);
                                            if (oneToolCall.function.name == "delete_file" && commandOutput != utils_1.Utils.MSG_NO_UESR_PERMISSION)
                                                deletedFiles.add(commandDescription);
                                        }
                                    }
                                    if (this.app.tools.vscodeToolsSelected.has(oneToolCall.function.name)) {
                                        let result = await vscode.lm.invokeTool(oneToolCall.function.name, { input: JSON.parse(oneToolCall.function.arguments), toolInvocationToken: undefined });
                                        commandOutput = result.content[0] ? result.content[0].value : "";
                                        ;
                                    }
                                }
                                catch (error) {
                                    // Handle the error
                                    console.error("An error occurred:", error);
                                    commandOutput = "Error during the execution of tool: " + oneToolCall.function.name;
                                    this.logText += "Error during the execution of tool " + oneToolCall.function.name + ": " + error + "\n\n";
                                    this.app.llamaWebviewProvider.logInUi(this.logText);
                                }
                                if (this.app.configuration.tools_log_calls)
                                    this.logText += "result:  \n" + commandOutput + "  \n";
                                this.app.llamaWebviewProvider.logInUi(this.logText);
                                toolCallsResult = {
                                    "role": "tool",
                                    "tool_call_id": oneToolCall.id,
                                    "content": commandOutput
                                };
                                this.messages.push(toolCallsResult);
                            }
                        }
                    }
                }
                catch (error) {
                    // Handle the error
                    console.error("An error occurred:", error);
                    this.logText += "An error occurred: " + error + "\n\n";
                    this.app.llamaWebviewProvider.logInUi(this.logText);
                    this.app.llamaWebviewProvider.setState("Error");
                    return "An error occurred: " + error;
                }
            }
            if (changedFiles.size + deletedFiles.size > 0)
                this.logText += "\n\nFiles changes:  \n";
            if (changedFiles.size > 0)
                this.logText += Array.from(changedFiles).join("  \n") + "  \n";
            if (deletedFiles.size > 0)
                this.logText += Array.from(deletedFiles).join("  \n") + "  \n";
            this.logText += "  \nAgent session finished. \n\n";
            this.app.llamaWebviewProvider.logInUi(this.logText);
            this.app.llamaWebviewProvider.setState("AI finished");
            let chat = this.app.menu.getChat();
            if (!this.app.menu.isChatSelected()) {
                chat.name = this.logText.slice(0, 25);
                chat.id = Date.now().toString(36);
                chat.description = new Date().toLocaleString() + " " + this.logText.slice(0, 150);
            }
            chat.messages = this.messages;
            chat.log = this.logText;
            await this.app.menu.selectUpdateChat(chat);
            // Clean up AbortController
            this.abortController = null;
            return response;
        };
        this.stopAgent = () => {
            this.lastStopRequestTime = Date.now();
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
        };
        this.getStepContext = (plan) => {
            let context = "";
            for (let i = 0; i < plan.length; i++) {
                const step = plan[i];
                if (step.result && step.state.toLowerCase() == "done") {
                    context = "Result from task - " + step.description + ":  \n" + step.result + "\n\n";
                }
            }
            return context;
        };
        this.getProgress = (plan) => {
            let progress = "";
            for (let i = 0; i < plan.length; i++) {
                const step = plan[i];
                progress = "Step " + step.id + " :: " + step.description + " :: " + " :: " + step.state + "  \n";
            }
            return progress;
        };
        this.app = application;
        this.resetMessages();
    }
    async summarize() {
        if (this.messages.length <= this.app.configuration.chats_msgs_keep) {
            return; // Not enough messages to summarize
        }
        // Preserve system messages and recent messages
        const systemMessages = this.messages.filter(m => m.role === 'system');
        const recentMessages = this.messages.slice(-this.app.configuration.chats_msgs_keep);
        const oldMessages = this.messages.slice(systemMessages.length, -this.app.configuration.chats_msgs_keep);
        if (oldMessages.length === 0) {
            return; // Nothing to summarize
        }
        try {
            const summary = await this.generateSummary(oldMessages);
            // Replace old messages with the summary
            this.messages = [
                ...systemMessages,
                {
                    role: 'system',
                    content: `Earlier conversation summary: ${summary}`
                },
                ...recentMessages
            ];
        }
        catch (error) {
            console.error('Failed to generate summary:', error);
            // Fallback: just keep recent messages and remove older ones
            this.messages = [...systemMessages, ...recentMessages];
        }
    }
    async generateSummary(messages) {
        let data = await this.app.llamaServer.getAgentCompletion(messages, true, undefined, this.abortController?.signal);
        return data?.choices[0]?.message?.content?.trim() || 'No summary generated';
    }
    async getItemContext(key, value) {
        let itemContext = "";
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(key.split("|")[0]));
        let parts = value.split("|");
        if (parts.length == 1) {
            itemContext += "\n\nFile " + key + ":\n\n" + document.getText().slice(0, this.app.configuration.rag_max_context_file_chars);
        }
        else {
            let firstLine = parseInt(parts[1]);
            let lastLine = parseInt(parts[2]);
            let fileContent = document.getText().split(/\r?\n/).slice(firstLine - 1, lastLine).join("\n");
            itemContext += "\n\nFile " + key + " content from line " + firstLine + " to line " + lastLine + " (one based):\n\n" + fileContent.slice(0, this.app.configuration.rag_max_context_file_chars);
        }
        return itemContext;
    }
}
exports.LlamaAgent = LlamaAgent;
//# sourceMappingURL=llama-agent.js.map