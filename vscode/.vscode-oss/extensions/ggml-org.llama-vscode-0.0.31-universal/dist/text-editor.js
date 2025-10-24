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
exports.TextEditor = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
class TextEditor {
    constructor(application) {
        this.decorationTypes = [];
        this.selectedText = '';
        this.removedSpaces = 0;
        this.suggestionUri = vscode.Uri.parse("");
        this.diffTitle = 'Text Edit Suggestion';
        this.app = application;
    }
    setSuggestionVisible(visible) {
        vscode.commands.executeCommand('setContext', 'textEditSuggestionVisible', visible);
    }
    async showEditPrompt(editor) {
        let chatUrl = this.app.configuration.endpoint_chat;
        if (!chatUrl)
            chatUrl = this.app.configuration.endpoint_tools;
        let chatModel = this.app.menu.getChatModel();
        if (!this.app.menu.isChatModelSelected())
            chatModel = this.app.menu.getToolsModel();
        if (chatModel.endpoint) {
            const chatEndpoint = utils_1.Utils.trimTrailingSlash(chatModel.endpoint);
            chatUrl = chatEndpoint ? chatEndpoint + "/" : "";
        }
        if (!chatUrl) {
            const shouldSelectModel = await utils_1.Utils.showUserChoiceDialog("Select a chat or tools model or an env with chat or tools model to edit code with AI.", "Select");
            if (shouldSelectModel) {
                this.app.menu.showEnvView();
                vscode.window.showInformationMessage("After the chat model is loaded, try again using Edit with AI.");
                return;
            }
            else {
                vscode.window.showErrorMessage("No endpoint for the chat model. Select an env with chat model or enter the endpoint of a running llama.cpp server with chat model in setting endpoint_chat. ");
                return;
            }
        }
        if (editor.selection.isEmpty) {
            vscode.window.showInformationMessage(this.app.configuration.getUiText("Please select some text to edit") ?? "");
            return;
        }
        utils_1.Utils.expandSelectionToFullLines(editor);
        const selection = editor.selection;
        let result = utils_1.Utils.removeLeadingSpaces(editor.document.getText(selection));
        this.selectedText = result.updatedText;
        this.removedSpaces = result.removedSpaces;
        this.selection = selection;
        this.currentEditor = editor;
        // Get context from surrounding code (10 lines before and after)
        const startLine = Math.max(0, selection.start.line - 10);
        const endLine = Math.min(editor.document.lineCount - 1, selection.end.line + 10);
        const contextRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
        const context = editor.document.getText(contextRange);
        // Create and show input box
        const prompt = await vscode.window.showInputBox({
            placeHolder: 'Enter your instructions for editing the text...',
            prompt: 'How would you like to modify the selected text?',
            ignoreFocusOut: true
        });
        if (!prompt) {
            return;
        }
        this.app.statusbar.showThinkingInfo();
        let data;
        try {
            try {
                data = await this.app.llamaServer.getChatEditCompletion(prompt, this.selectedText, context, this.app.extraContext.chunks, 0);
            }
            catch (error) {
                vscode.window.showErrorMessage('Error getting suggestions. Please check if the server with chat model is running.');
                return;
            }
            if (!data || !data.choices[0].message.content) {
                vscode.window.showInformationMessage('No suggestions available');
                return;
            }
            this.currentSuggestion = this.removeFirstAndLastLinesIfBackticks(data.choices[0].message.content.trim());
            this.currentSuggestion = utils_1.Utils.addLeadingSpaces(this.currentSuggestion, this.removedSpaces);
            // Show the suggestion in a diff view
            await this.showDiffView(editor, this.currentSuggestion);
            this.setSuggestionVisible(true);
            // Wait for user to either accept (Tab) or close the diff view
            // The cleanup will be handled by the acceptSuggestion method or when the diff view is closed
        }
        catch (error) {
            vscode.window.showErrorMessage('Error getting suggestions. Please check if llama.cpp server is running.');
            await this.cleanup();
        }
        finally {
            this.app.statusbar.showInfo(undefined);
        }
    }
    removeFirstAndLastLinesIfBackticks(input) {
        const lines = input.split('\n'); // Split the string into lines
        // Remove the first line if it starts with ```
        if (lines[0]?.trim().startsWith('```')) {
            lines.shift(); // Remove the first line
        }
        // Remove the last line if it starts with ```
        if (lines[lines.length - 1]?.trim().startsWith('```')) {
            lines.pop(); // Remove the last line
        }
        return lines.join('\n'); // Join the remaining lines back into a string
    }
    async showDiffView(editor, suggestion) {
        // Get context before and after the selection
        const startLine = 0;
        const endLine = editor.document.lineCount - 1;
        // Get the text before the selection
        const beforeRange = new vscode.Range(startLine, 0, this.selection.start.line, 0);
        const beforeText = editor.document.getText(beforeRange);
        // Get the text after the selection
        const afterRange = new vscode.Range(this.selection.end.line, editor.document.lineAt(this.selection.end.line).text.length, endLine, editor.document.lineAt(endLine).text.length);
        const afterText = editor.document.getText(afterRange);
        // Combine the context with the suggestion
        const fullSuggestion = beforeText + suggestion + afterText;
        // Create a temporary document for the suggestion using a custom scheme
        const extension = editor.document.uri.toString().split('.').pop();
        this.suggestionUri = vscode.Uri.parse('llama-suggestion:suggestion.' + extension);
        // Register a content provider for our custom scheme
        const provider = new class {
            provideTextDocumentContent(uri) {
                return fullSuggestion;
            }
        };
        // Register the provider
        const registration = vscode.workspace.registerTextDocumentContentProvider('llama-suggestion', provider);
        await vscode.commands.executeCommand('vscode.diff', editor.document.uri, this.suggestionUri, this.diffTitle);
        setTimeout(async () => {
            try {
                // Navigate to the first difference
                await vscode.commands.executeCommand('workbench.action.compareEditor.nextChange');
            }
            catch (error) {
                console.error('Failed to navigate to first difference:', error);
            }
        }, 300);
        // Store the registration to dispose later
        this.registration = registration;
    }
    async acceptSuggestion() {
        // Only accept the suggestion if the diff view is currently active
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== this.suggestionUri.toString()) {
            return;
        }
        if (!this.currentSuggestion || !this.currentEditor || !this.selection) {
            return;
        }
        await this.applyChange(this.currentEditor, this.currentSuggestion);
        this.setSuggestionVisible(false);
        // Clean up after applying the change
        await this.cleanup();
    }
    async rejectSuggestion() {
        // Only reject the suggestion if the diff view is currently active
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== this.suggestionUri.toString()) {
            return;
        }
        if (!this.currentSuggestion || !this.currentEditor || !this.selection) {
            return;
        }
        this.setSuggestionVisible(false);
        // Clean up without applying the change
        await this.cleanup();
    }
    async applyChange(editor, suggestion) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, this.selection, suggestion);
        await vscode.workspace.applyEdit(edit);
    }
    async cleanup() {
        // Close the diff editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        // Dispose of the content provider registration
        if (this.registration) {
            this.registration.dispose();
            this.registration = undefined;
        }
        this.currentSuggestion = undefined;
        this.currentEditor = undefined;
        this.selection = undefined;
        this.setSuggestionVisible(false);
    }
}
exports.TextEditor = TextEditor;
//# sourceMappingURL=text-editor.js.map