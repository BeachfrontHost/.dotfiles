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
exports.LlamaServer = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode_1 = __importDefault(require("vscode"));
const utils_1 = require("./utils");
const cp = __importStar(require("child_process"));
const util = __importStar(require("util"));
const STATUS_OK = 200;
class LlamaServer {
    constructor(application) {
        this.aiModel = "";
        this.defaultRequestParams = {
            top_k: 40,
            top_p: 0.99,
            stream: false,
            samplers: ["top_k", "top_p", "infill"],
            cache_prompt: true,
        };
        this.getFIMCompletion = async (inputPrefix, inputSuffix, prompt, chunks, nindent) => {
            // If the server is OpenAI compatible, use the OpenAI API to get the completion
            if (this.app.configuration.use_openai_endpoint) {
                const response = await this.handleOpenAICompletion(chunks, inputPrefix, inputSuffix, prompt);
                return response || undefined;
            }
            // else, default to llama.cpp
            let { endpoint, model, requestConfig } = this.getComplModelProperties();
            if (!endpoint) {
                const selectionMessate = "Select a completion model or an env with completion model to use code completion (code suggestions by AI).";
                const shouldSelectModel = await utils_1.Utils.showUserChoiceDialog(selectionMessate, "Select");
                if (shouldSelectModel) {
                    this.app.menu.showEnvView();
                    vscode_1.default.window.showInformationMessage("After the completion model is loaded, try again using code completion.");
                    return;
                }
                else {
                    const shouldDisable = await utils_1.Utils.showYesNoDialog("Do you want to disable completions? (You could enable them from llama-vscode menu.)");
                    if (shouldDisable) {
                        await this.app.menu.setCompletion(false);
                        vscode_1.default.window.showInformationMessage("The completions are disabled. You could enable them from llama-vscode menu.");
                    }
                    else
                        vscode_1.default.window.showErrorMessage("No endpoint for the completion (fim) model. Select an env with completion model or enter the endpoint of a running llama.cpp server with completion (fim) model in setting endpoint. ");
                    return;
                }
            }
            const response = await axios_1.default.post(`${utils_1.Utils.trimTrailingSlash(endpoint)}/infill`, this.createRequestPayload(false, inputPrefix, inputSuffix, chunks, prompt, model, nindent), requestConfig);
            return response.status === STATUS_OK ? response.data : undefined;
        };
        this.getChatEditCompletion = async (instructions, originalText, context, chunks, nindent) => {
            let { endpoint, model, requestConfig } = this.getChatModelProperties();
            const response = await axios_1.default.post(`${utils_1.Utils.trimTrailingSlash(endpoint)}/${this.app.configuration.ai_api_version}/chat/completions`, this.createChatEditRequestPayload(instructions, originalText, context, model), requestConfig);
            return response.status === STATUS_OK ? response.data : undefined;
        };
        this.getChatCompletion = async (prompt) => {
            let { endpoint, model, requestConfig } = this.getChatModelProperties();
            const response = await axios_1.default.post(`${utils_1.Utils.trimTrailingSlash(endpoint)}/${this.app.configuration.ai_api_version}/chat/completions`, this.createChatRequestPayload(prompt, model), requestConfig);
            return response.status === STATUS_OK ? response.data : undefined;
        };
        this.getAgentCompletion = async (messages, isSummarization = false, onDelta, abortSignal) => {
            let selectedModel = this.app.menu.getToolsModel();
            let model = this.app.configuration.ai_model;
            if (selectedModel?.aiModel !== undefined && selectedModel.aiModel)
                model = selectedModel.aiModel;
            let endpoint = this.app.configuration.endpoint_tools;
            if (selectedModel?.endpoint !== undefined && selectedModel.endpoint)
                endpoint = selectedModel.endpoint;
            let requestConfig = this.app.configuration.axiosRequestConfigTools;
            if (selectedModel?.isKeyRequired !== undefined && selectedModel.isKeyRequired) {
                const apiKey = this.app.persistence.getApiKey(selectedModel.endpoint ?? "");
                if (apiKey) {
                    requestConfig = {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                    };
                }
            }
            let uri = `${utils_1.Utils.trimTrailingSlash(endpoint)}/${this.app.configuration.ai_api_version}/chat/completions`;
            let request;
            if (isSummarization) {
                request = this.createGetSummaryRequestPayload(messages, model);
                const response = await axios_1.default.post(uri, request, { ...requestConfig, signal: abortSignal });
                return response.status === STATUS_OK ? response.data : undefined;
            }
            // Streaming branch for tools/agent calls
            request = this.createToolsRequestPayload(messages, model, true);
            try {
                const streamResponse = await axios_1.default.post(uri, request, { ...requestConfig, responseType: 'stream', signal: abortSignal });
                return await new Promise((resolve) => {
                    const readable = streamResponse.data;
                    let buffer = "";
                    let fullContent = "";
                    let finishReason = undefined;
                    const toolCalls = [];
                    const message = { role: 'assistant', content: null };
                    const finalize = () => {
                        message.content = fullContent || null;
                        if (toolCalls.length > 0)
                            message.tool_calls = toolCalls;
                        resolve({
                            choices: [{
                                    message,
                                    finish_reason: finishReason,
                                }]
                        });
                    };
                    // Handle abort signal
                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => {
                            readable.destroy?.();
                            resolve(undefined);
                        });
                    }
                    readable.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                        const lines = buffer.split(/\r?\n/);
                        buffer = lines.pop() || "";
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed)
                                continue;
                            if (!trimmed.startsWith('data:'))
                                continue;
                            const payload = trimmed.slice(5).trim();
                            if (payload === '[DONE]') {
                                finalize();
                                readable.removeAllListeners();
                                return;
                            }
                            try {
                                const json = JSON.parse(payload);
                                const choice = json.choices && json.choices[0] ? json.choices[0] : undefined;
                                if (!choice)
                                    continue;
                                // Finish reason may appear on a later chunk
                                if (choice.finish_reason)
                                    finishReason = choice.finish_reason;
                                const delta = choice.delta || choice.message || {};
                                if (delta.role && !message.role)
                                    message.role = delta.role;
                                if (typeof delta.content === 'string') {
                                    fullContent += delta.content;
                                    if (onDelta)
                                        onDelta(delta.content);
                                }
                                if (Array.isArray(delta.tool_calls)) {
                                    for (const tc of delta.tool_calls) {
                                        const idx = typeof tc.index === 'number' ? tc.index : 0;
                                        if (!toolCalls[idx]) {
                                            toolCalls[idx] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } };
                                        }
                                        const tgt = toolCalls[idx];
                                        if (tc.id)
                                            tgt.id = tc.id;
                                        if (tc.function) {
                                            if (tc.function.name)
                                                tgt.function.name = tc.function.name;
                                            if (tc.function.arguments)
                                                tgt.function.arguments = (tgt.function.arguments || '') + tc.function.arguments;
                                        }
                                    }
                                }
                            }
                            catch (e) {
                                // Ignore malformed chunks
                            }
                        }
                    });
                    readable.on('end', () => {
                        if (!finishReason)
                            finishReason = 'stop';
                        finalize();
                    });
                    readable.on('error', () => {
                        resolve(undefined);
                    });
                });
            }
            catch (err) {
                return undefined;
            }
        };
        this.updateExtraContext = (chunks) => {
            // If the server is OpenAI compatible, use the OpenAI API to prepare for the next FIM
            if (this.app.configuration.use_openai_endpoint) {
                return;
            }
            // else, make a request to the API to prepare for the next FIM
            let { endpoint, model, requestConfig } = this.getComplModelProperties();
            axios_1.default.post(`${utils_1.Utils.trimTrailingSlash(endpoint)}/infill`, this.createRequestPayload(true, "", "", chunks, "", model, undefined), requestConfig);
        };
        this.getEmbeddings = async (text) => {
            try {
                let selectedModel = this.app.menu.getEmbeddingsModel();
                let model = this.app.configuration.ai_model;
                if (selectedModel.aiModel)
                    model = selectedModel.aiModel;
                let endpoint = this.app.configuration.endpoint_embeddings;
                if (selectedModel.endpoint)
                    endpoint = selectedModel.endpoint;
                let requestConfig = this.app.configuration.axiosRequestConfigEmbeddings;
                if (selectedModel.isKeyRequired) {
                    const apiKey = this.app.persistence.getApiKey(selectedModel.endpoint ?? "");
                    if (apiKey) {
                        requestConfig = {
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                "Content-Type": "application/json",
                            },
                        };
                    }
                }
                const response = await axios_1.default.post(`${utils_1.Utils.trimTrailingSlash(endpoint)}/v1/embeddings`, {
                    "input": text,
                    // "model": "GPT-4",
                    ...(model.trim() != "" && { model: model }),
                    "encoding_format": "float"
                }, requestConfig);
                return response.data;
            }
            catch (error) {
                console.error('Failed to get embeddings:', error);
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error getting embeddings") + " " + error.message);
                return undefined;
            }
        };
        this.shellFimCmd = (launchCmd) => {
            if (!launchCmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeFimTerminal = vscode_1.default.window.createTerminal({
                    name: 'llama.cpp Completion Terminal'
                });
                this.vsCodeFimTerminal.show(true);
                this.vsCodeFimTerminal.sendText(launchCmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + launchCmd + " : " + err.message);
                }
            }
        };
        this.shellChatCmd = (launchCmd) => {
            if (!launchCmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeChatTerminal = vscode_1.default.window.createTerminal({
                    name: 'llama.cpp Chat Terminal'
                });
                this.vsCodeChatTerminal.show(true);
                this.vsCodeChatTerminal.sendText(launchCmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + launchCmd + " : " + err.message);
                }
            }
        };
        this.shellEmbeddingsCmd = (launchCmd) => {
            if (!launchCmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeEmbeddingsTerminal = vscode_1.default.window.createTerminal({
                    name: 'llama.cpp Embeddings Terminal'
                });
                this.vsCodeEmbeddingsTerminal.show(true);
                this.vsCodeEmbeddingsTerminal.sendText(launchCmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + launchCmd + " : " + err.message);
                }
            }
        };
        this.shellToolsCmd = (launchCmd) => {
            if (!launchCmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeToolsTerminal = vscode_1.default.window.createTerminal({
                    name: 'llama.cpp Tools Terminal'
                });
                this.vsCodeToolsTerminal.show(true);
                this.vsCodeToolsTerminal.sendText(launchCmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + launchCmd + " : " + err.message);
                }
            }
        };
        this.shellTrainCmd = (trainCmd) => {
            if (!trainCmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeTrainTerminal = vscode_1.default.window.createTerminal({
                    name: 'llama.cpp Train Terminal'
                });
                this.vsCodeTrainTerminal.show(true);
                this.vsCodeTrainTerminal.sendText(trainCmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + trainCmd + " : " + err.message);
                }
            }
        };
        this.shellCommandCmd = (cmd) => {
            if (!cmd) {
                vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("There is no command to execute.") ?? "");
                return;
            }
            try {
                this.vsCodeCommandTerminal = vscode_1.default.window.createTerminal({
                    name: 'Command Terminal'
                });
                this.vsCodeCommandTerminal.show(true);
                this.vsCodeCommandTerminal.sendText(cmd);
            }
            catch (err) {
                if (err instanceof Error) {
                    vscode_1.default.window.showInformationMessage(this.app.configuration.getUiText("Error executing command") + " " + cmd + " : " + err.message);
                }
            }
        };
        this.executeCommandWithTerminalFeedback = async (command) => {
            const exec = util.promisify(cp.exec);
            this.killCommandCmd();
            // Create terminal for user feedback
            // const terminal = vscode.window.createTerminal(terminalName);
            // if (!this.vsCodeCommandTerminal){
            this.vsCodeCommandTerminal = vscode_1.default.window.createTerminal({
                name: 'llama-vscode Command Terminal'
            });
            // }
            this.vsCodeCommandTerminal.show(true);
            this.vsCodeCommandTerminal.sendText(`echo "Executing: ${command}"`);
            try {
                // Execute command programmatically for reliable output
                const { stdout, stderr } = await exec(command);
                // Show output in   terminal
                this.vsCodeCommandTerminal.sendText(`echo "Command completed successfully"`);
                this.vsCodeCommandTerminal.sendText(`echo "Output: ${stdout.trim()}"`);
                return { stdout, stderr };
            }
            catch (error) {
                this.vsCodeCommandTerminal.sendText(`echo "Command failed: ${error.message}"`);
                return { stdout: "", stderr: error.message };
            }
            finally {
                // Keep terminal open for a bit, then dispose
                // setTimeout(() => terminal.dispose(), 5000);
            }
        };
        this.killFimCmd = () => {
            if (this.vsCodeFimTerminal) {
                this.vsCodeFimTerminal.dispose();
                this.vsCodeFimTerminal = undefined;
            }
        };
        this.isFimRunning = () => {
            if (this.vsCodeFimTerminal)
                return true;
            else
                return false;
        };
        this.killChatCmd = () => {
            if (this.vsCodeChatTerminal) {
                this.vsCodeChatTerminal.dispose();
                this.vsCodeChatTerminal = undefined;
            }
        };
        this.isChatRunning = () => {
            if (this.vsCodeChatTerminal)
                return true;
            else
                return false;
        };
        this.killEmbeddingsCmd = () => {
            if (this.vsCodeEmbeddingsTerminal) {
                this.vsCodeEmbeddingsTerminal.dispose();
                this.vsCodeEmbeddingsTerminal = undefined;
            }
        };
        this.isEmbeddingsRunning = () => {
            if (this.vsCodeEmbeddingsTerminal)
                return true;
            else
                return false;
        };
        this.isToolsRunning = () => {
            if (this.vsCodeToolsTerminal)
                return true;
            else
                return false;
        };
        this.killTrainCmd = () => {
            if (this.vsCodeTrainTerminal) {
                this.vsCodeTrainTerminal.dispose();
                this.vsCodeChatTerminal = undefined;
            }
        };
        this.killCommandCmd = () => {
            if (this.vsCodeCommandTerminal) {
                this.vsCodeCommandTerminal.dispose();
                this.vsCodeCommandTerminal = undefined;
            }
        };
        this.killToolsCmd = () => {
            if (this.vsCodeToolsTerminal) {
                this.vsCodeToolsTerminal.dispose();
                this.vsCodeToolsTerminal = undefined;
            }
        };
        this.app = application;
        this.vsCodeFimTerminal = undefined;
        this.vsCodeChatTerminal = undefined;
        this.vsCodeEmbeddingsTerminal = undefined;
        this.vsCodeTrainTerminal = undefined;
        this.vsCodeCommandTerminal = undefined;
        this.vsCodeToolsTerminal = undefined;
    }
    async handleOpenAICompletion(chunks, inputPrefix, inputSuffix, prompt, isPreparation = false) {
        const client = this.app.configuration.openai_client;
        if (!client)
            return;
        const additional_context = chunks.length > 0 ? "Context:\n\n" + chunks.join("\n") : "";
        const replacements = {
            inputPrefix: inputPrefix.slice(-this.app.configuration.n_prefix),
            prompt: prompt,
            inputSuffix: inputSuffix.slice(0, this.app.configuration.n_suffix),
        };
        const rsp = await client.completions.create({
            model: this.app.configuration.openai_client_model || "",
            prompt: additional_context + this.app.prompts.replacePlaceholders(this.app.configuration.openai_prompt_template, replacements),
            max_tokens: this.app.configuration.n_predict,
            temperature: 0.1,
            top_p: this.defaultRequestParams.top_p,
            stream: this.defaultRequestParams.stream,
        });
        if (isPreparation)
            return;
        return {
            content: rsp.choices[0].text,
            generation_settings: {
                finish_reason: rsp.choices[0].finish_reason,
                model: rsp.model,
                created: rsp.created,
            },
            timings: {
                prompt_ms: rsp.usage?.prompt_tokens,
                predicted_ms: rsp.usage?.completion_tokens,
                predicted_n: rsp.usage?.total_tokens,
            },
        };
    }
    createRequestPayload(noPredict, inputPrefix, inputSuffix, chunks, prompt, model, nindent) {
        if (noPredict) {
            return {
                input_prefix: inputPrefix,
                input_suffix: inputSuffix,
                input_extra: chunks,
                prompt,
                n_predict: 0,
                samplers: [],
                cache_prompt: true,
                t_max_prompt_ms: this.app.configuration.t_max_prompt_ms,
                t_max_predict_ms: 1,
                ...(this.app.configuration.lora_completion.trim() != "" && { lora: [{ id: 0, scale: 0.5 }] })
            };
        }
        return {
            input_prefix: inputPrefix,
            input_suffix: inputSuffix,
            input_extra: chunks,
            prompt,
            n_predict: this.app.configuration.n_predict,
            ...this.defaultRequestParams,
            ...(nindent && { n_indent: nindent }),
            t_max_prompt_ms: this.app.configuration.t_max_prompt_ms,
            t_max_predict_ms: this.app.configuration.t_max_predict_ms,
            ...(this.app.configuration.lora_completion.trim() != "" && { lora: [{ id: 0, scale: 0.5 }] }),
            ...(model.trim() != "" && { model: model })
        };
    }
    createChatEditRequestPayload(instructions, originalText, context, model) {
        const replacements = {
            instructions: instructions,
            originalText: originalText,
        };
        return {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert coder."
                },
                {
                    "role": "user",
                    "content": this.app.prompts.replacePlaceholders(this.app.prompts.CHAT_EDIT_TEXT, replacements)
                }
            ],
            "stream": false,
            "cache_prompt": true,
            "temperature": 0.8,
            "top_p": 0.95,
            ...(this.app.configuration.lora_chat.trim() != "" && { lora: [{ id: 0, scale: 0.5 }] }),
            ...(model.trim() != "" && { model: model }),
        };
    }
    // Helper – removes every thought block, regardless of format
    // -------------------------------------------------------------
    /**
     * Strip all “thought” sections from a message string.
     *
     * Supported formats:
     *   <think> … </think>
     *   <|channel|>analysis<|message|> … <|end|>
     *
     * If the input is `null` the function returns `null` unchanged.
     */
    stripThoughts(content) {
        if (content === null)
            return null;
        // Opening tags: <think>  OR  <|channel|>analysis<|message|>
        const OPEN = /<think>|<\|channel\|>analysis<\|message\|>/g;
        // Closing tags: </think>  OR  <|end|>
        const CLOSE = /<\/think>|<\|end\|>/g;
        // Build a single regex that matches an opening tag, anything (lazy),
        // then a closing tag.
        const THOUGHT_BLOCK = new RegExp(`(?:${OPEN.source})[\\s\\S]*?(?:${CLOSE.source})`, 'g');
        // Remove every thought block and trim the result.
        return content.replace(THOUGHT_BLOCK, '').trim();
    }
    // -------------------------------------------------------------
    // Public utility – filter thought from an array of messages
    // -------------------------------------------------------------
    filterThoughtFromMsgs(messages) {
        return messages.map((msg) => {
            // Non‑assistant messages never contain thoughts, return them untouched.
            if (msg.role !== 'assistant') {
                return msg;
            }
            // `msg.content` is guaranteed to be a string for assistants,
            // but we stay defensive and accept `null` as well.
            const originalContent = msg.content;
            const cleanedContent = this.stripThoughts(originalContent);
            // Preserve every other field (name, function_call, …) unchanged.
            return {
                ...msg,
                content: cleanedContent,
            };
        });
    }
    createChatRequestPayload(content, model) {
        return {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert coder."
                },
                {
                    "role": "user",
                    "content": content
                }
            ],
            "stream": false,
            "temperature": 0.8,
            ...(this.app.configuration.lora_chat.trim() != "" && { lora: [{ id: 0, scale: 0.5 }] }),
            ...(model.trim() != "" && { model: model }),
        };
    }
    createToolsRequestPayload(messages, model, stream = false) {
        this.app.tools.addSelectedTools();
        let filteredMsgs = this.filterThoughtFromMsgs(messages);
        return {
            "messages": filteredMsgs,
            "stream": stream,
            "temperature": 0.8,
            "top_p": 0.95,
            ...(model.trim() != "" && { model: model }),
            "tools": [...this.app.tools.tools, ...this.app.tools.vscodeTools],
            "tool_choice": "auto"
        };
    }
    createGetSummaryRequestPayload(messages, model) {
        let filteredMsgs = this.filterThoughtFromMsgs(messages);
        const summaryPromptMsgs = [
            {
                role: 'system',
                content: `Summarize the conversation concisely, preserving technical details and code solutions.`
            },
            ...filteredMsgs
        ];
        return {
            "messages": summaryPromptMsgs,
            "stream": false,
            "temperature": 0.8,
            "top_p": 0.95,
            ...(model.trim() != "" && { model: model })
        };
    }
    getChatModelProperties() {
        let selectedModel = this.app.menu.getChatModel();
        if (!this.app.menu.isChatModelSelected())
            selectedModel = this.app.menu.getToolsModel();
        let model = this.app.configuration.ai_model;
        if (selectedModel?.aiModel !== undefined && selectedModel.aiModel)
            model = selectedModel.aiModel;
        let endpoint = this.app.configuration.endpoint_chat;
        if (!endpoint)
            endpoint = this.app.configuration.endpoint_tools;
        if (selectedModel?.endpoint !== undefined && selectedModel.endpoint)
            endpoint = selectedModel.endpoint;
        let requestConfig = this.app.configuration.axiosRequestConfigChat;
        if (selectedModel?.isKeyRequired !== undefined && selectedModel.isKeyRequired) {
            const apiKey = this.app.persistence.getApiKey(selectedModel.endpoint ?? "");
            if (apiKey) {
                requestConfig = {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                };
            }
        }
        return { endpoint, model, requestConfig };
    }
    getComplModelProperties() {
        const selectedComplModel = this.app.menu.getComplModel();
        let model = this.app.configuration.ai_model;
        if (selectedComplModel?.aiModel !== undefined && selectedComplModel.aiModel)
            model = selectedComplModel.aiModel;
        let endpoint = this.app.configuration.endpoint;
        if (selectedComplModel?.endpoint !== undefined && selectedComplModel.endpoint)
            endpoint = selectedComplModel.endpoint;
        let requestConfig = this.app.configuration.axiosRequestConfigCompl;
        if (selectedComplModel?.isKeyRequired !== undefined && selectedComplModel.isKeyRequired) {
            const apiKey = this.app.persistence.getApiKey(selectedComplModel.endpoint ?? "");
            if (apiKey) {
                requestConfig = {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                };
            }
        }
        return { endpoint, model, requestConfig };
    }
}
exports.LlamaServer = LlamaServer;
//# sourceMappingURL=llama-server.js.map