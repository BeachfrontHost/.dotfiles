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
exports.Tools = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const plugin_1 = require("./plugin");
class Tools {
    constructor(application) {
        this.toolsFunc = new Map();
        this.toolsFuncDesc = new Map();
        this.tools = [];
        this.vscodeTools = [];
        this.vscodeToolsSelected = new Map();
        this.runTerminalCommand = async (args) => {
            let command = JSON.parse(args).command;
            if (command == undefined)
                return "The terminal command is not provided.";
            let commandOutput = "";
            if ((!this.app.configuration.tool_permit_some_terminal_commands || utils_1.Utils.isModifyingCommand(command))) {
                let [yesApply, yesDontAsk] = await utils_1.Utils.showYesYesdontaskNoDialog("Do you give a permission to execute the terminal command:\n" + command +
                    "\n\n If you answer with 'Yes, don't ask again', the safe terminal commands (do not change files or environment) will be executed without confirmation.");
                if (yesDontAsk) {
                    this.app.configuration.updateConfigValue("tool_permit_some_terminal_commands", true);
                    vscode.window.showInformationMessage("Setting tool_permit_some_terminal_commands is set to true.");
                }
                if (!yesApply)
                    return "The user doesn't give a permission to execute this command.";
                ;
            }
            else {
                let { stdout, stderr } = await this.app.llamaServer.executeCommandWithTerminalFeedback(command);
                commandOutput = (stdout + "\n\n" + stderr).slice(0, this.app.configuration.MAX_CHARS_TOOL_RETURN);
            }
            return commandOutput;
        };
        this.runTerminalCommandDesc = async (args) => {
            let command = JSON.parse(args).command;
            return "Executing terminal command: " + command;
        };
        this.searchSource = async (args) => {
            let query = JSON.parse(args).query;
            if (query == undefined)
                return "The searhc request is not provided.";
            await this.indexFilesIfNeeded();
            let contextChunks = await this.app.chatContext.getRagContextChunks(query);
            let relevantSource = await this.app.chatContext.getContextChunksInPlainText(contextChunks);
            return relevantSource;
        };
        this.searchSourceDesc = async (args) => {
            let query = JSON.parse(args).query;
            return " Searching source code for: " + query;
        };
        this.readFile = async (args) => {
            let params = JSON.parse(args);
            let filePath = params.file_path;
            let uri;
            if (filePath == undefined)
                return "The file is not provided.";
            try {
                let absolutePath = utils_1.Utils.getAbsolutFilePath(filePath);
                if (absolutePath == "")
                    return "File not found: " + filePath;
                uri = vscode.Uri.file(absolutePath);
                const document = await vscode.workspace.openTextDocument(uri);
                if (params.should_read_entire_file)
                    return document.getText();
                if (params.last_line_inclusive > document.lineCount)
                    params.last_line_inclusive = document.lineCount;
                if (params.first_line < 0 || params.first_line > params.last_line_inclusive) {
                    return 'Invalid line range';
                }
                let lastLine = Math.min(params.last_line_inclusive - 1, params.first_line + 249, document.lineCount - 1);
                // Create range from first line's start to last line's end
                const startPos = new vscode.Position(Math.max(params.first_line - 1, 0), 0);
                const endPos = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
                const range = new vscode.Range(startPos, endPos);
                return document.getText(range);
            }
            catch (error) {
                return "File not found: " + filePath;
            }
        };
        this.readFileDesc = async (args) => {
            let params = JSON.parse(args);
            let filePath = params.file_path;
            return "Reading file: " + filePath;
        };
        this.readDirectory = async (args) => {
            let params = JSON.parse(args);
            let dirPath = params.directory_path;
            let uri;
            if (dirPath == undefined)
                return "The directory is not provided.";
            let absolutePath = dirPath;
            if (!path_1.default.isAbsolute(dirPath)) {
                if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                    return "File not found: " + dirPath;
                }
                // Resolve against first workspace folder
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                absolutePath = path_1.default.join(workspaceRoot, dirPath);
            }
            try {
                return utils_1.Utils.listDirectoryContents(absolutePath);
            }
            catch (error) {
                return "Error reading directory: " + dirPath;
            }
        };
        this.readDirectoryDesc = async (args) => {
            let params = JSON.parse(args);
            let dirPath = params.directory_path;
            return "Listing directory: " + dirPath;
        };
        this.getRegextMatches = async (args) => {
            let params = JSON.parse(args);
            if (params.regex == undefined)
                return "The regex is not provided.";
            await this.indexFilesIfNeeded();
            return utils_1.Utils.getRegexpMatches(params.include_pattern, params.exclude_pattern ?? "", params.regex, this.app.chatContext.entries);
        };
        this.getRegextMatchesDesc = async (args) => {
            let params = JSON.parse(args);
            return "Regex search for: " + params.regex;
        };
        this.deleteFile = async (args) => {
            let params = JSON.parse(args);
            let filePath = params.file_path;
            if (filePath == undefined)
                return "The file is not provided.";
            try {
                const absolutePath = utils_1.Utils.getAbsolutFilePath(filePath);
                if (!this.app.configuration.tool_permit_file_changes && !await utils_1.Utils.showYesNoDialog("Do you give a permission to delete file:\n" + absolutePath)) {
                    return utils_1.Utils.MSG_NO_UESR_PERMISSION;
                }
                if (!fs_1.default.existsSync(absolutePath)) {
                    return `File not found at ${filePath}`;
                }
                fs_1.default.unlinkSync(absolutePath);
            }
            catch (error) {
                if (error instanceof Error) {
                    return `Failed to delete file at ${filePath}: ${error.message}`;
                }
                return `Failed to delete file at ${filePath} due to an unknown error`;
            }
            return `Successfully deleted file ${filePath}`;
        };
        this.deleteFileDesc = async (args) => {
            let params = JSON.parse(args);
            let filePath = params.file_path;
            return "Deleted file: " + filePath;
        };
        this.getDiff = async (args) => {
            try {
                const diff = await this.app.git.getLatestChanges();
                console.log('Changes since last commit:', diff);
                return diff ?? "";
            }
            catch (error) {
                console.error('Error changes since last commit:', error);
                throw error;
            }
        };
        this.getDiffDesc = async (args) => {
            return "Getting latest changes.";
        };
        this.editFile = async (args) => {
            let params = JSON.parse(args);
            let changes = params.input;
            if (params.input == undefined)
                return "The input is not provided.";
            let filePath = this.getFilePath(params.input);
            if (!filePath)
                return "The file is not provided.";
            try {
                if (!this.app.configuration.tool_permit_file_changes) {
                    let [yesApply, yesDontAsk] = await utils_1.Utils.showYesYesdontaskNoDialog("Do you permit file " + filePath + " to be changed?");
                    if (yesDontAsk) {
                        this.app.configuration.updateConfigValue("tool_permit_file_changes", true);
                        vscode.window.showInformationMessage("Setting tool_permit_file_changes is set to true.");
                    }
                    if (!yesApply)
                        return utils_1.Utils.MSG_NO_UESR_PERMISSION;
                }
                await utils_1.Utils.applyEdits(changes);
                return "The file is updated ";
            }
            catch (error) {
                console.error('Error changes since last commit:', error);
                throw error;
            }
        };
        this.editFileDesc = async (args) => {
            let params = JSON.parse(args);
            let diffText = params.input;
            if (!diffText)
                return "EditFile Desc - parameter input not found.";
            let filePath = this.getFilePath(diffText);
            return "Edited file " + filePath;
        };
        this.askUser = async (args) => {
            let params = JSON.parse(args);
            let question = params.question;
            if (question == undefined)
                return "The question is not provided.";
            const answer = await vscode.window.showInputBox({
                placeHolder: 'Answer',
                prompt: question,
                validateInput: text => {
                    return text.length === 0 ? 'Please enter a value' : null;
                }
            });
            if (answer !== undefined) {
                return answer;
            }
            return "No answer from the user.";
        };
        this.askUserDesc = async (args) => {
            let params = JSON.parse(args);
            let question = params.question;
            return "Ask user: " + question;
        };
        this.customTool = async (args) => {
            let result = "";
            let workspaceFolder = "";
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            }
            let source = this.app.configuration.tool_custom_tool_source;
            if (source.startsWith("http")) {
                let htmlResult = await utils_1.Utils.fetchWebPage(source);
                result = utils_1.Utils.extractTextFromHtml(htmlResult);
            }
            else if (fs_1.default.existsSync(source)) {
                result = fs_1.default.readFileSync(source, 'utf-8');
            }
            else {
                result = "File " + source + " does not exist!";
            }
            return result;
        };
        this.customToolDesc = async (args) => {
            return "Custom tool is executed.";
        };
        this.customEvalTool = async (args) => {
            let params = JSON.parse(args);
            if (params.input == undefined)
                return "The input is not provided.";
            let functionCode = "";
            let settingValue = this.app.configuration.tool_custom_eval_tool_code;
            if (settingValue.startsWith("function")) {
                functionCode = settingValue;
            }
            else {
                // Assumes this is a file
                if (fs_1.default.existsSync(settingValue))
                    functionCode = fs_1.default.readFileSync(settingValue, 'utf-8');
                else
                    return "Error: There is no function to eval!";
            }
            const functionString = '(' + functionCode + ')';
            const toolFunction = eval(functionString);
            let result = toolFunction(params.input);
            return result === null ? "null" : result === undefined ? "undefined" : String(result);
        };
        this.customEvalToolDesc = async (args) => {
            let params = JSON.parse(args);
            return "Custom eval tool is executed. Input: " + params.input;
        };
        this.llamaVscodeHelp = async (args) => {
            return await utils_1.Utils.getExtensionHelp();
        };
        this.llamaVscodeHelpDesc = async (args) => {
            return "llama_vscode_help tool is executed. ";
        };
        this.init = () => {
            this.tools = [
                ...(this.app.configuration.tool_run_terminal_command_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "run_terminal_command",
                            "description": "Runs the provided command in a terminal and returns the result. For Windows uses powershell.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "command": {
                                        "type": "string",
                                        "description": "The command to be executed in the terminal"
                                    }
                                },
                                "required": [
                                    "command"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_search_source_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "search_source",
                            "description": "Searches the code base and returns relevant code frangments from the files.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The query to search the relevat code"
                                    }
                                },
                                "required": [
                                    "query"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_read_file_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "read_file",
                            "description": "Read the contents of a file from first_line to last_line_inclusive, at most 250 lines at a time or the entire file if parameter should_read_entire_file is true.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "first_line": {
                                        "type": "integer",
                                        "description": "The number of first line to read. Starts with 1."
                                    },
                                    "last_line_inclusive": {
                                        "type": "integer",
                                        "description": "The number of last line to read. Line numbers start with 1"
                                    },
                                    "should_read_entire_file": {
                                        "type": "boolean",
                                        "description": "Whether to read the entire file. Defaults to false.",
                                    },
                                    "file_path": {
                                        "type": "string",
                                        "description": "The path of the file to read"
                                    }
                                },
                                "required": [
                                    "first_line", "last_line_inclusive", "file_path"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_list_directory_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "list_directory",
                            "description": "List the contents of a directory. The quick tool to understand the file structure and explore the codebase.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "directory_path": {
                                        "type": "string",
                                        "description": "Absolute or relative workspace path"
                                    },
                                },
                                "required": [
                                    "directory_path"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_regex_search_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "regex_search",
                            "description": "Fast text-based regex search in the code base (prefer it for finding exact function names or expressions) that finds exact pattern matches with file names and line numbers within files or directories. If there is no exclude_pattern - provide an empty string. Returns up to 50 matches in format file_name:line_number: line_content",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "include_pattern": {
                                        "type": "string",
                                        "description": "Glob pattern for files to include (specify file extensions only if you are absolutely sure)"
                                    },
                                    "exclude_pattern": {
                                        "type": "string",
                                        "description": "Glob pattern for files to exclude"
                                    },
                                    "regex": {
                                        "type": "string",
                                        "description": "A string for constructing a typescript RegExp pattern to search for. Escape special regex characters when needed."
                                    }
                                },
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_delete_file_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "delete_file",
                            "description": "Deletes a file at the specified path.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "file_path": {
                                        "description": "The path of the file to delete, absolute or relative to the workspace root.",
                                        "type": "string"
                                    },
                                },
                                "required": [
                                    "file_path"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_get_diff_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "get_diff",
                            "description": "Gets the files changes since last commit",
                            "parameters": {
                                "type": "object",
                                "required": [],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_edit_file_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "edit_file",
                            "description": this.app.prompts.TOOL_APPLY_EDITS,
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "input": {
                                        "description": `Files changes in SEARCH/REPLACE block format`,
                                        "type": "string",
                                    },
                                },
                                "required": [
                                    "input"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_ask_user_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "ask_user",
                            "description": "Use this tool to ask the user for clarifications if something is unclear.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "question": {
                                        "type": "string",
                                        "description": "The question to the user."
                                    },
                                },
                                "required": [
                                    "question"
                                ],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_custom_tool_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "custom_tool",
                            "description": this.app.configuration.tool_custom_tool_description,
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_custom_eval_tool_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "custom_eval_tool",
                            "description": this.app.configuration.tool_custom_eval_tool_description,
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "input": {
                                        "type": "string",
                                        "description": this.app.configuration.tool_custom_eval_tool_property_description
                                    },
                                },
                                "required": [],
                            },
                            "strict": true
                        }
                    }
                ] : []),
                ...(this.app.configuration.tool_llama_vscode_help_enabled ? [
                    {
                        "type": "function",
                        "function": {
                            "name": "llama_vscode_help",
                            "description": "Returns a help text for llama-vscode in .md format. Use this tool for information about llama-vscode (synonim: llama.vscode) extension: how to use it, what are chat, completion, embeddings and tools models, what is orchestra, how to add/edit/remove them, how to select them, etc.",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": [],
                            },
                            "strict": true
                        }
                    }
                ] : []),
            ];
            for (let tool of this.app.configuration.tools_custom) {
                if (tool.enabled) {
                    this.tools.push(tool.tool);
                    if (tool.tool_function && fs_1.default.existsSync(tool.tool_function)) {
                        let toolFunction = utils_1.Utils.getFunctionFromFile(tool.tool_function);
                        this.toolsFunc.set(tool.tool.function.name, toolFunction);
                    }
                    else {
                        this.toolsFunc.set(tool.tool.function.name, plugin_1.Plugin.getFunction(tool.tool_function));
                    }
                    if (tool.tool_function_desc && fs_1.default.existsSync(tool.tool_function_desc)) {
                        let toolFunction = utils_1.Utils.getFunctionFromFile(tool.tool_function_desc);
                        this.toolsFuncDesc.set(tool.tool.function.name, toolFunction);
                    }
                    else {
                        this.toolsFuncDesc.set(tool.tool.function.name, plugin_1.Plugin.getFunction(tool.tool_function_desc));
                    }
                }
            }
        };
        this.selectTools = async () => {
            // Define items with initial selection state
            const toolItems = [];
            let customToolsNames = [];
            const appPrefix = "llama.vscode_";
            for (let customTool of this.app.configuration.tools_custom) {
                toolItems.push({ label: appPrefix + customTool.tool.function.name, description: "", picked: customTool.enabled });
                customToolsNames.push(customTool.tool.function.name);
            }
            for (let internalTool of this.toolsFunc.keys()) {
                if (!customToolsNames.includes(internalTool)) {
                    toolItems.push({ label: appPrefix + internalTool, description: "", picked: this.app.configuration[this.getToolEnabledPropertyName(internalTool)] });
                }
            }
            for (let tool of vscode.lm.tools) {
                toolItems.push({ label: tool.name, description: tool.description, picked: this.vscodeToolsSelected.has(tool.name) });
            }
            // Show multi-select quick pick
            const selection = await vscode.window.showQuickPick(toolItems, {
                canPickMany: true,
                placeHolder: 'Select tools',
            });
            // Handle user selection
            if (selection) {
                const selectedLabels = selection.map(item => item.label);
                this.vscodeToolsSelected = new Map();
                let toolsCustom = this.app.configuration.tools_custom;
                for (let customTool of toolsCustom) {
                    customTool.enabled = selectedLabels.includes(appPrefix + customTool.tool.function.name);
                }
                await this.app.configuration.updateConfigValue("tools_custom", toolsCustom);
                for (let toolName of this.toolsFunc.keys()) {
                    if (!customToolsNames.includes(toolName)) {
                        let newEnabledValue = selectedLabels.includes(appPrefix + toolName);
                        await this.app.configuration.updateConfigValue(this.getToolEnabledPropertyName(toolName), newEnabledValue);
                    }
                }
                for (let toolName of selectedLabels) {
                    if (!toolName.startsWith(appPrefix)) {
                        this.vscodeToolsSelected.set(toolName, true);
                    }
                }
            }
            else {
                // User canceled
            }
        };
        this.addSelectedTools = () => {
            this.vscodeToolsSelected.set("mcp_playwright_browser_navigate", true);
            this.vscodeTools = [];
            for (let tool of vscode.lm.tools) {
                if (this.vscodeToolsSelected.has(tool.name) && tool.inputSchema && tool.inputSchema && 'properties' in tool.inputSchema) {
                    let propertyNames = Object.keys(tool.inputSchema["properties"]);
                    let toolProperties = {};
                    let toolRequiredProps = [];
                    for (let property of propertyNames) {
                        let propType = tool.inputSchema.properties ? tool.inputSchema.properties[property].type : "";
                        let propDesc = tool.inputSchema.properties ? tool.inputSchema.properties[property].description : "";
                        toolProperties = { ...toolProperties, [property]: { type: propType, description: propDesc } };
                        toolRequiredProps = tool.inputSchema["required"];
                    }
                    let newTool = {
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": {
                                "type": "object",
                                "properties": toolProperties
                            },
                            "required": toolRequiredProps,
                            "strict": true
                        },
                    };
                    this.vscodeTools.push(newTool);
                }
            }
        };
        this.app = application;
        this.toolsFunc.set("run_terminal_command", this.runTerminalCommand);
        this.toolsFunc.set("search_source", this.searchSource);
        this.toolsFunc.set("read_file", this.readFile);
        this.toolsFunc.set("list_directory", this.readDirectory);
        this.toolsFunc.set("regex_search", this.getRegextMatches);
        this.toolsFunc.set("delete_file", this.deleteFile);
        this.toolsFunc.set("get_diff", this.getDiff);
        this.toolsFunc.set("edit_file", this.editFile);
        this.toolsFunc.set("ask_user", this.askUser);
        this.toolsFunc.set("custom_tool", this.customTool);
        this.toolsFunc.set("custom_eval_tool", this.customEvalTool);
        this.toolsFunc.set("llama_vscode_help", this.llamaVscodeHelp);
        this.toolsFuncDesc.set("run_terminal_command", this.runTerminalCommandDesc);
        this.toolsFuncDesc.set("search_source", this.searchSourceDesc);
        this.toolsFuncDesc.set("read_file", this.readFileDesc);
        this.toolsFuncDesc.set("list_directory", this.readDirectoryDesc);
        this.toolsFuncDesc.set("regex_search", this.getRegextMatchesDesc);
        this.toolsFuncDesc.set("delete_file", this.deleteFileDesc);
        this.toolsFuncDesc.set("get_diff", this.getDiffDesc);
        this.toolsFuncDesc.set("edit_file", this.editFileDesc);
        this.toolsFuncDesc.set("ask_user", this.askUserDesc);
        this.toolsFuncDesc.set("custom_tool", this.customToolDesc);
        this.toolsFuncDesc.set("custom_eval_tool", this.customEvalToolDesc);
        this.toolsFuncDesc.set("llama_vscode_help", this.llamaVscodeHelpDesc);
    }
    getFilePath(diffText) {
        let filePath = "";
        const blocks = diffText.split("```diff");
        if (blocks.slice(1).length > 0) {
            let blockParts = utils_1.Utils.extractConflictParts("```diff" + blocks.slice(1)[0]);
            filePath = blockParts[0].trim();
        }
        else {
            if (diffText.length > 0)
                filePath = utils_1.Utils.extractConflictParts("```diff\n" + diffText)[0].trim();
            else
                return "";
        }
        let absolutePath = filePath;
        if (!path_1.default.isAbsolute(filePath)) {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                return "File not found: " + filePath;
            }
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            absolutePath = path_1.default.join(workspaceRoot, filePath);
        }
        return absolutePath;
    }
    async indexFilesIfNeeded() {
        if (!this.app.configuration.rag_enabled) {
            vscode.window.showInformationMessage("Enable RAG to avoid reindexing. Project files will be indexed now.");
            await this.app.chatContext.indexWorkspaceFiles();
        }
    }
    getToolEnabledPropertyName(toolName) {
        return "tool_" + toolName + "_enabled";
    }
}
exports.Tools = Tools;
//# sourceMappingURL=tools.js.map