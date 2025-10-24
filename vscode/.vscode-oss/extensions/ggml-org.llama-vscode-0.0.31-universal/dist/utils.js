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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const vscode_1 = __importDefault(require("vscode"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const picomatch_1 = __importDefault(require("picomatch"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const url_1 = require("url");
class Utils {
    static expandSelectionToFullLines(editor) {
        if (!editor) {
            return;
        }
        const document = editor.document;
        const selections = editor.selections;
        const newSelections = selections.map(selection => {
            const startLine = selection.start.line;
            const endLine = selection.end.line;
            const newStart = new vscode_1.default.Position(startLine, 0);
            const endLineText = document.lineAt(endLine).text;
            const newEnd = new vscode_1.default.Position(endLine, endLineText.length);
            return new vscode_1.default.Selection(newStart, newEnd);
        });
        editor.selections = newSelections;
    }
    static async confirmAction(message, details = "") {
        const fullMessage = message + (details ? "\n\n" + details : "");
        return Utils.showYesNoDialog(fullMessage);
    }
    static async getValidatedInput(prompt, validator, maxAttempts = 3, options = {}) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const fullOptions = {
                prompt,
                ...options
            };
            const input = await vscode_1.default.window.showInputBox(fullOptions);
            if (input === undefined) {
                return undefined; // User cancelled
            }
            if (validator(input)) {
                return input;
            }
            if (attempt < maxAttempts) {
                vscode_1.default.window.showWarningMessage(`Invalid input on attempt ${attempt}. ${attempt + 1 - 1} more attempts.`);
            }
        }
        vscode_1.default.window.showErrorMessage(`Maximum attempts (${maxAttempts}) reached. Input validation failed.`);
        return undefined;
    }
}
exports.Utils = Utils;
_a = Utils;
Utils.MSG_NO_UESR_PERMISSION = "The user doesn't give a permission to execute the request!";
Utils.EMPTY_CHAT = { name: "", id: "" };
Utils.getLeadingSpaces = (input) => {
    // Match the leading spaces using a regular expression
    const match = input.match(/^[ \t]*/);
    return match ? match[0] : "";
};
Utils.delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
Utils.getPrefixLines = (document, position, nPrefix) => {
    const startLine = Math.max(0, position.line - nPrefix);
    return Array.from({ length: position.line - startLine }, (_, i) => document.lineAt(startLine + i).text);
};
Utils.getSuffixLines = (document, position, nSuffix) => {
    const endLine = Math.min(document.lineCount - 1, position.line + nSuffix);
    return Array.from({ length: endLine - position.line }, (_, i) => document.lineAt(position.line + 1 + i).text);
};
Utils.removeTrailingNewLines = (suggestionLines) => {
    while (suggestionLines.length > 0 && suggestionLines.at(-1)?.trim() == "") {
        suggestionLines.pop();
    }
};
Utils.getChunksInPlainText = (chunksToSend) => {
    let extraCont = "Here are pieces of code from different files of the project: \n"
        + chunksToSend.reduce((accumulator, currentValue) => accumulator + "\nFile Name: "
            + currentValue.filename + "\nText:\n" + currentValue.text + "\n\n", "");
    return extraCont;
};
Utils.computeBM25Stats = (docs) => {
    const docFreq = new Map();
    const termFreq = new Map();
    const docLengths = [];
    let totalDocs = 0;
    for (let docId = 0; docId < docs.length; docId++) {
        const doc = docs[docId];
        docLengths.push(doc.length);
        const termsInDoc = new Set();
        for (const term of doc) {
            // Update term frequency (per-doc)
            if (!termFreq.has(term)) {
                termFreq.set(term, new Map());
            }
            const termDocMap = termFreq.get(term);
            termDocMap.set(docId, (termDocMap.get(docId) || 0) + 1);
            termsInDoc.add(term);
        }
        // Update document frequency (global)
        for (const term of termsInDoc) {
            docFreq.set(term, (docFreq.get(term) || 0) + 1);
        }
        totalDocs++;
    }
    const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / totalDocs;
    return {
        avgDocLength,
        docFreq: Object.fromEntries(docFreq),
        docLengths,
        termFreq: Object.fromEntries(Array.from(termFreq).map(([k, v]) => [k, Object.fromEntries(v)])),
        totalDocs
    };
};
Utils.bm25Score = (queryTerms, docIndex, stats, k1 = 1.5, b = 0.75) => {
    let score = 0;
    for (const term of queryTerms) {
        if (!stats.termFreq[term])
            continue;
        const tf = stats.termFreq[term][docIndex] || 0;
        const idf = Math.log((stats.totalDocs - stats.docFreq[term] + 0.5) / (stats.docFreq[term] + 0.5) + 1);
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * stats.docLengths[docIndex] / stats.avgDocLength);
        score += idf * numerator / denominator;
    }
    return score;
};
Utils.removeLeadingSpaces = (textToUpdate) => {
    const lines = textToUpdate.split(/\r?\n/);
    // Find the length of the shortest leading space
    let nSpacesToRemove = Infinity;
    for (const line of lines) {
        if (line.trim().length === 0)
            continue;
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        if (leadingSpaces < nSpacesToRemove) {
            nSpacesToRemove = leadingSpaces;
        }
    }
    if (nSpacesToRemove === Infinity || nSpacesToRemove === 0) {
        return {
            removedSpaces: 0,
            updatedText: textToUpdate
        };
    }
    // Remove nSpacesToRemove leading characters from each line
    const updatedLines = lines.map(line => line.length >= nSpacesToRemove
        ? line.substring(nSpacesToRemove)
        : line);
    return {
        removedSpaces: nSpacesToRemove,
        updatedText: updatedLines.join('\n')
    };
};
Utils.addLeadingSpaces = (textToUpdate, spacesToAdd) => {
    const spaces = ' '.repeat(spacesToAdd);
    return textToUpdate
        .split('\n')
        .map(line => spaces + line)
        .join('\n');
};
Utils.executeTerminalCommand = async (command, cwd) => {
    return new Promise((resolve, reject) => {
        const options = cwd ? { cwd } : undefined;
        command = process.platform === 'win32'
            ? `powershell -Command "${command.replace(/"/g, '\\"')}"`
            : command;
        (0, child_process_1.exec)(command, options, (error, stdout, stderr) => {
            if (error) {
                resolve(error.message);
                return;
            }
            else
                resolve(stdout.toString());
        });
    });
};
Utils.isModifyingCommand = (command) => {
    if (!command || typeof command !== 'string') {
        return false;
    }
    const normalizedCmd = command.trim().toLowerCase();
    // List of modifying command patterns (both Windows and Unix)
    const modifyingPatterns = [
        // File operations
        /^(rm|del|erase|remove)\b/,
        /^rd\b/,
        /^rmdir\b/,
        /^(mv|move|ren|rename)\b/,
        /^(cp|copy)\b/,
        /^mkdir\b/,
        /^ni\b/,
        /^out\-file\b/,
        /^set\-content\b/,
        /^add\-content\b/,
        /^scp\b/,
        /^rsync\b/,
        // System modifications
        /^chmod\b/,
        /^chown\b/,
        /^attrib\b/,
        /^icacls\b/,
        /^cacls\b/,
        /^reg\b/,
        /^netsh\b/,
        /^net\b/,
        /^diskpart\b/,
        /^format\b/,
        // Package management
        /^(apt|yum|dnf|pacman|brew|pip|npm|pnpm|yarn|dotnet|winget|choco)\b/,
        // Process management
        /^(kill|taskkill|stop\-process)\b/,
        /^start\b/,
        // Network operations
        /^(ssh|ftp|sftp)\b/,
        // Installation/execution
        /^\.\/\S+/,
        /^\.\\\S+/,
        /^\w+:\\\S+/,
        /^\.\S+\b/,
        /^install\b/,
        /^uninstall\b/,
        /^setup\b/,
        /^msiexec\b/,
        // Dangerous patterns
        /^>/,
        /^>>/,
        /^\|/,
        /^&\S*/,
        /^;\S*/,
        /^\$\w+\s*=/ // Variable assignment (might lead to modifications)
    ];
    if (modifyingPatterns.some(pattern => pattern.test(normalizedCmd))) {
        return true;
    }
    const readOnlyPatterns = [
        /^echo\b/,
        /^dir\b/,
        /^ls\b/,
        /^cat\b/,
        /^type\b/,
        /^get\-content\b/,
        /^get\-childitem\b/,
        /^pwd\b/,
        /^cd\b/,
        /^chdir\b/,
        /^where\b/,
        /^which\b/,
        /^find\b/,
        /^grep\b/,
        /^select\-string\b/,
        /^help\b/,
        /^man\b/,
        /^--help\b/,
        /^-h\b/,
        /^\?/,
        /^exit\b/,
        /^clear\b/,
        /^cls\b/
    ];
    if (readOnlyPatterns.some(pattern => pattern.test(normalizedCmd))) {
        return false;
    }
    return true;
};
Utils.showYesNoDialog = async (message) => {
    const choice = await vscode_1.default.window.showInformationMessage("llama-vscode \n\n" + message, { modal: true }, // Makes the dialog modal (blocks interaction until resolved)
    'Yes', 'No');
    return choice === 'Yes';
};
Utils.showUserChoiceDialog = async (message, acceptLable) => {
    const choice = await vscode_1.default.window.showInformationMessage("llama-vscode \n\n" + message, { modal: true }, // Makes the dialog modal (blocks interaction until resolved)
    acceptLable);
    return choice === acceptLable;
};
Utils.showYesYesdontaskNoDialog = async (message) => {
    const choice = await vscode_1.default.window.showInformationMessage("llama-vscode \n\n" + message, { modal: true }, // Makes the dialog modal (blocks interaction until resolved)
    'Yes', "Yes, don't ask again", 'No');
    return [choice === 'Yes' || choice === "Yes, don't ask again", choice === "Yes, don't ask again"];
};
Utils.showOkDialog = async (message) => {
    const choice = await vscode_1.default.window.showInformationMessage("llama-vscode \n\n" + message, { modal: true }, // Makes the dialog modal (blocks interaction until resolved)
    'OK');
};
Utils.getAbsolutePath = async (shortFileName) => {
    try {
        // Search for files matching the name (glob pattern requires **/)
        const files = await vscode_1.default.workspace.findFiles(`**/${shortFileName}`, null, 1);
        if (files.length > 0) {
            return files[0].fsPath;
        }
        vscode_1.default.window.showWarningMessage(`File "${shortFileName}" not found in workspace`);
        return undefined;
    }
    catch (error) {
        vscode_1.default.window.showErrorMessage(`Error searching for file: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
    }
};
Utils.listDirectoryContents = (absolutePath) => {
    try {
        if (!fs_1.default.existsSync(absolutePath)) {
            return `Error: Path does not exist - ${absolutePath}`;
        }
        if (!fs_1.default.statSync(absolutePath).isDirectory()) {
            return `Error: Path is not a directory - ${absolutePath}`;
        }
        const contents = fs_1.default.readdirSync(absolutePath, { withFileTypes: true });
        let output = `Contents of ${absolutePath}:\n\n`;
        const directories = contents.filter(dirent => dirent.isDirectory()).map(dirent => `[DIR] ${dirent.name}`);
        const files = contents.filter(dirent => dirent.isFile()).map(dirent => `[FILE] ${dirent.name}`);
        output += directories.join('\n');
        if (directories.length && files.length)
            output += '\n';
        output += files.join('\n');
        return output;
    }
    catch (error) {
        return `Error reading directory: ${error instanceof Error ? error.message : String(error)}`;
    }
};
Utils.getRegexpMatches = (includeGlob, excludeGlobPtr, searchPattern, chunks) => {
    const MAX_REG_EXP_MATCHES = 50;
    let matches = "";
    let totalMatches = 0;
    const regexSearch = new RegExp(searchPattern);
    const isMatchInclude = includeGlob == undefined || includeGlob.trim() == "" ? undefined : (0, picomatch_1.default)(includeGlob);
    const isMatchExclude = excludeGlobPtr == undefined || excludeGlobPtr.trim() == "" ? undefined : (0, picomatch_1.default)(excludeGlobPtr);
    let valuesIterator = chunks.values();
    let chunkIter = valuesIterator.next();
    while (!chunkIter.done) {
        let chunk = chunkIter.value;
        if (chunk && (isMatchInclude == undefined || isMatchInclude(chunk.uri)) && (isMatchExclude == undefined || !isMatchExclude(chunk.uri))) {
            const lines = chunk.content.split('\n');
            let index = 0;
            for (const line of lines) {
                if (regexSearch.test(line)) {
                    matches += "\n" + chunk.uri + ":" + (chunk.firstLine + index) + ": " + line;
                    totalMatches++;
                    if (totalMatches > MAX_REG_EXP_MATCHES)
                        return matches;
                }
                index++;
            }
        }
        chunkIter = valuesIterator.next();
    }
    if (matches.trim() == "")
        matches = "No matches found";
    return matches;
};
Utils.getAbsolutFilePath = (filePath) => {
    if (path_1.default.isAbsolute(filePath)) {
        return filePath;
    }
    else {
        if (!vscode_1.default.workspace.workspaceFolders || vscode_1.default.workspace.workspaceFolders.length === 0) {
            return "";
        }
        // Resolve against first workspace folder
        const workspaceRoot = vscode_1.default.workspace.workspaceFolders[0].uri.fsPath;
        const absolutePath = path_1.default.resolve(workspaceRoot, filePath);
        return absolutePath;
    }
};
Utils.deleteFile = (filePath) => {
    try {
        const absolutePath = Utils.getAbsolutFilePath(filePath);
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
Utils.fileOrDirExists = async (path) => {
    try {
        await fs_1.default.promises.access(path);
        return true;
    }
    catch {
        return false;
    }
};
Utils.escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
Utils.editFile = (fileContent, edits) => {
    const existingCodeMarker = '// ... existing code ...';
    const editParts = edits.split(existingCodeMarker).filter(part => part.trim() !== '');
    let currentContent = fileContent;
    for (let i = 0; i < editParts.length; i++) {
        const part = editParts[i];
        const lines = part.split(/\r?\n/);
        let contextBefore = '';
        let contextAfter = '';
        if (i === 0 && !edits.startsWith(existingCodeMarker)) {
            // First edit part: use only contextAfter if available
            if (lines.length >= 3) {
                contextAfter = lines.slice(-3).join('\n');
            }
            else {
                contextAfter = lines.join('\n');
            }
        }
        else if (i === editParts.length - 1 && !edits.endsWith(existingCodeMarker)) {
            // Last edit part: use only contextBefore if available
            if (lines.length >= 3) {
                contextBefore = lines.slice(0, 3).join('\n');
            }
            else {
                contextBefore = lines.join('\n');
            }
        }
        else {
            // Middle edit parts: use both contextBefore and contextAfter
            if (lines.length >= 6) {
                contextBefore = lines.slice(0, 3).join('\n');
                contextAfter = lines.slice(-3).join('\n');
            }
            else {
                const half = Math.floor(lines.length / 2);
                contextBefore = lines.slice(0, half).join('\n');
                contextAfter = lines.slice(-half).join('\n');
            }
        }
        if (i === 0 && contextAfter && !edits.trim().startsWith(existingCodeMarker)) {
            // First edit part: match from start to contextAfter
            const afterPattern = Utils.escapeRegExp(contextAfter);
            const regex = new RegExp(`([\\s\\S]*?)${afterPattern}`);
            const match = currentContent.match(regex);
            if (match) {
                const startPos = match.index + match[1].length;
                currentContent = part + currentContent.substring(startPos + match[0].length - match[1].length);
            }
        }
        else if (i === editParts.length - 1 && contextBefore && !edits.trim().endsWith(existingCodeMarker)) {
            // Last edit part: match from contextBefore to end
            const beforePattern = Utils.escapeRegExp(contextBefore);
            const regex = new RegExp(`${beforePattern}([\\s\\S]*)`);
            const match = currentContent.match(regex);
            // TODO - use the last match
            if (match) {
                const startPos = match.index;
                currentContent = currentContent.substring(0, startPos) + part;
            }
        }
        else if (contextBefore && contextAfter) {
            // Middle edit parts: match between contextBefore and contextAfter
            const beforePattern = Utils.escapeRegExp(contextBefore);
            const afterPattern = Utils.escapeRegExp(contextAfter);
            const regex = new RegExp(`${beforePattern}([\\s\\S]*?)${afterPattern}`);
            currentContent = currentContent.replace(regex, part);
        }
    }
    return currentContent;
};
Utils.applyEdits = async (diffText) => {
    // Extract edit blocks from the diff-fenced format
    let editBlocks = [];
    if (!diffText)
        return "Edit file: The input parameter is missing!";
    const blocks = diffText.split("```diff");
    for (const block of blocks.slice(1)) {
        editBlocks.push(Utils.extractConflictParts("```diff" + block));
    }
    if (editBlocks.length === 0) {
        if (diffText.length > 0)
            editBlocks.push(Utils.extractConflictParts("```diff\n" + diffText));
        else
            return "";
    }
    for (const block of editBlocks) {
        if (block.length === 3) {
            let filePath = block[0].trim();
            if (filePath.startsWith("<file_path>"))
                filePath = filePath.slice("<file_path>".length);
            if (filePath.endsWith("</file_path>"))
                filePath = filePath.slice(0, -"</file_path>".length);
            let searchText = block[1].trim();
            // Make sure only \n is used for new line
            searchText = searchText.split(/\r?\n/).join("\n");
            const replaceText = block[2].trim();
            let result = "";
            let absolutePath = filePath;
            if (!path_1.default.isAbsolute(filePath)) {
                if (!vscode_1.default.workspace.workspaceFolders || vscode_1.default.workspace.workspaceFolders.length === 0) {
                    return "File not found: " + filePath;
                }
                const workspaceRoot = vscode_1.default.workspace.workspaceFolders[0].uri.fsPath;
                absolutePath = path_1.default.join(workspaceRoot, filePath);
            }
            try {
                const fileExists = await fs_1.default.promises.access(absolutePath).then(() => true).catch(() => false);
                if (!fileExists) {
                    await fs_1.default.promises.mkdir(path_1.default.dirname(absolutePath), { recursive: true });
                    await fs_1.default.promises.writeFile(absolutePath, result);
                }
                // Ensure only \n is used for new line
                result = (await fs_1.default.promises.readFile(absolutePath, 'utf-8')).split(/\r?\n/).join("\n");
                // Handle empty search text case
                if (searchText.trim() === '') {
                    result += '\n' + replaceText;
                }
                else if (result.includes(searchText)) {
                    result = result.split(searchText).join(replaceText);
                }
                await fs_1.default.promises.writeFile(absolutePath, result);
            }
            catch (error) {
                if (error instanceof Error)
                    return "Error edititing file " + filePath + " - " + error.message;
                else
                    return "Error edititing file " + filePath + " - " + error;
            }
        }
    }
};
Utils.extractConflictParts = (input) => {
    const lines = input.split(/\r?\n/);
    const part1 = [];
    const part2 = [];
    const part3 = [];
    let i = 0;
    while (i < lines.length && !lines[i].startsWith('<<<<<<< SEARCH')) {
        part1.push(lines[i]);
        i++;
    }
    while (i < lines.length && !lines[i].startsWith('=======')) {
        part2.push(lines[i]);
        i++;
    }
    while (i < lines.length && !lines[i].startsWith('>>>>>>> REPLACE')) {
        part3.push(lines[i]);
        i++;
    }
    return [
        part1.slice(1).join('\n'),
        part2.slice(1).join('\n'),
        part3.slice(1).join('\n')
    ];
};
Utils.showYesNoPopup = (message) => {
    return new Promise((resolve) => {
        const panel = vscode_1.default.window.createWebviewPanel('yesNoPopup', 'Confirmation', { viewColumn: vscode_1.default.ViewColumn.One, preserveFocus: true }, { enableScripts: true });
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 16px;
                    text-align: center;
                }
                .message {
                    margin-bottom: 20px;
                    white-space: pre-wrap;
                }
                .button {
                    margin: 0 8px;
                    padding: 4px 12px;
                    border: none;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                }
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                </style>
            </head>
            <body>
                <div class="message">${message.replace(/\n/g, '<br>')}</div>
                <button class="button" onclick="respond(true)">Yes</button>
                <button class="button" onclick="respond(false)">No</button>
                <script>
                const vscode = acquireVsCodeApi();
                function respond(answer) {
                    vscode.postMessage({ command: 'answer', value: answer });
                }
                </script>
            </body>
            </html>
            `;
        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'answer') {
                resolve(message.value);
                panel.dispose();
            }
        });
    });
};
Utils.fetchWebPage = async (url) => {
    // Validate the URL
    let parsedUrl;
    try {
        parsedUrl = new url_1.URL(url);
    }
    catch (error) {
        throw new Error(`Invalid URL: ${url}`);
    }
    // Select the appropriate protocol module
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
        const req = protocol.get(url, (res) => {
            // Check status code
            if (res.statusCode !== 200) {
                res.resume(); // Consume response data to free up memory
                reject(new Error(`Request failed with status code ${res.statusCode}`));
                return;
            }
            // Set encoding
            res.setEncoding('utf8');
            let rawData = '';
            // Collect chunks of data
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            // Resolve when complete
            res.on('end', () => {
                resolve(rawData);
            });
        });
        // Handle errors
        req.on('error', (error) => {
            reject(new Error(`Request error: ${error.message}`));
        });
        // Set timeout
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timed out after 10 seconds'));
        });
    });
};
Utils.extractTextFromHtml = (html) => {
    // Basic HTML tag removal
    let text = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    return text;
};
Utils.trimTrailingSlash = (s) => {
    if (s.length > 0 && s[s.length - 1] === "/") {
        return s.slice(0, -1);
    }
    return s;
};
Utils.readExtensionFile = async (relativePath) => {
    // Get the extension's context (passed in activation)
    const extension = vscode_1.default.extensions.getExtension('ggml-org.llama-vscode');
    if (!extension) {
        throw new Error('Extension not found');
    }
    const absolitePath = path_1.default.join(extension.extensionPath, relativePath);
    try {
        // Read the file content
        return await fs_1.default.promises.readFile(absolitePath, 'utf-8');
    }
    catch (error) {
        return `Failed to read extension file: ${error instanceof Error ? error.message : String(error)}`;
    }
};
Utils.getExtensionHelp = async () => {
    return Utils.readExtensionFile("resources/help.md");
};
Utils.removeFaOption = (input) => {
    return input.replace(/-fa[^-]*/g, '');
};
Utils.removeFaOptionFromModels = (chatModels) => {
    for (let model of chatModels) {
        if (model.localStartCommand)
            model.localStartCommand = Utils.removeFaOption(model.localStartCommand);
    }
};
Utils.removeFaOptionFromEnvs = (envs) => {
    for (let env of envs) {
        if (env.chat && env.chat.localStartCommand)
            env.chat.localStartCommand = Utils.removeFaOption(env.chat.localStartCommand);
        if (env.tools && env.tools.localStartCommand)
            env.tools.localStartCommand = Utils.removeFaOption(env.tools.localStartCommand);
    }
};
Utils.isTimeToUpgrade = (date1, date2, interval) => {
    const twentyFourHoursInMs = interval * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeDifference = date2.getTime() - date1.getTime();
    return timeDifference >= twentyFourHoursInMs;
};
Utils.getFunctionFromFile = (filePath) => {
    let functionCode = fs_1.default.readFileSync(filePath, 'utf-8');
    const functionString = '(' + functionCode + ')';
    const toolFunction = eval(functionString);
    return toolFunction;
};
//# sourceMappingURL=utils.js.map