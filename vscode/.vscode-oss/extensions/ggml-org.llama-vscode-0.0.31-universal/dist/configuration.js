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
exports.Configuration = void 0;
const vscode = __importStar(require("vscode"));
const openai_1 = __importDefault(require("openai"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const translations_1 = require("./translations");
const utils_1 = require("./utils");
class Configuration {
    constructor() {
        // extension configs
        this.enabled = true;
        this.launch_completion = "";
        this.launch_chat = "";
        this.launch_embeddings = "";
        this.launch_tools = "";
        this.launch_training_completion = "";
        this.launch_training_chat = "";
        this.lora_completion = "";
        this.lora_chat = "";
        this.endpoint = "http=//127.0.0.1:8012";
        this.endpoint_chat = "http=//127.0.0.1:8011";
        this.endpoint_tools = "http=//127.0.0.1:8011";
        this.endpoint_embeddings = "http=//127.0.0.1:8010";
        this.new_completion_model_port = 8012;
        this.new_chat_model_port = 8011;
        this.new_embeddings_model_port = 8010;
        this.new_tools_model_port = 8009;
        this.new_completion_model_host = "127.0.0.1";
        this.new_chat_model_host = "127.0.0.1";
        this.new_embeddings_model_host = "127.0.0.1";
        this.new_tools_model_host = "127.0.0.1";
        this.auto = true;
        this.api_key = "";
        this.api_key_chat = "";
        this.api_key_tools = "";
        this.api_key_embeddings = "";
        this.self_signed_certificate = "";
        this.n_prefix = 256;
        this.n_suffix = 64;
        this.n_predict = 128;
        this.t_max_prompt_ms = 500;
        this.t_max_predict_ms = 2500;
        this.show_info = true;
        this.max_line_suffix = 8;
        this.max_cache_keys = 250;
        this.ring_n_chunks = 16;
        this.ring_chunk_size = 64;
        this.ring_scope = 1024;
        this.ring_update_ms = 1000;
        this.language = "en";
        // experimental - avoid using
        this.use_openai_endpoint = false;
        this.openai_client = null;
        this.openai_client_model = "";
        this.openai_prompt_template = "<|fim_prefix|>{inputPrefix}{prompt}<|fim_suffix|>{inputSuffix}<|fim_middle|>";
        this.rag_enabled = true;
        this.rag_chunk_max_chars = 800;
        this.rag_max_lines_per_chunk = 40;
        this.rag_max_chars_per_chunk_line = 300;
        this.rag_max_files = 10000;
        this.rag_max_chunks = 50000;
        this.rag_max_bm25_filter_chunks = 47;
        this.rag_max_embedding_filter_chunks = 5;
        this.rag_max_context_files = 3;
        this.rag_max_context_file_chars = 10000;
        this.tool_run_terminal_command_enabled = true;
        this.tool_search_source_enabled = true;
        this.tool_read_file_enabled = true;
        this.tool_list_directory_enabled = true;
        this.tool_regex_search_enabled = true;
        this.tool_delete_file_enabled = true;
        this.tool_permit_some_terminal_commands = false;
        this.tool_permit_file_changes = false;
        this.tool_get_diff_enabled = false;
        this.tool_edit_file_enabled = true;
        this.tool_ask_user_enabled = true;
        this.tool_custom_tool_enabled = false;
        this.tool_custom_tool_description = "";
        this.tool_custom_tool_source = "";
        this.tool_custom_eval_tool_enabled = false;
        this.tool_custom_eval_tool_description = "";
        this.tool_custom_eval_tool_property_description = "";
        this.tool_custom_eval_tool_code = "";
        this.tool_llama_vscode_help_enabled = true;
        this.tool_save_plan_enabled = false;
        this.tool_update_task_enabled = false;
        this.tools_max_iterations = 50;
        this.tools_log_calls = false;
        this.chats_max_history = 50;
        this.chats_max_tokens = 64000;
        this.chats_summarize_old_msgs = false;
        this.chats_msgs_keep = 50;
        this.completion_models_list = new Array();
        this.embeddings_models_list = new Array();
        this.tools_models_list = new Array();
        this.chat_models_list = new Array();
        this.envs_list = new Array();
        this.env_start_last_used = false;
        this.env_start_last_used_confirm = true;
        this.ask_install_llamacpp = true;
        this.ask_upgrade_llamacpp_hours = 24;
        this.ai_api_version = "v1";
        this.ai_model = "google/gemini-2.5-flash";
        this.agents_list = new Array();
        this.agent_rules = "";
        this.agent_commands = new Array();
        this.tools_custom = new Array();
        this.context_custom = {};
        // additional configs`
        // TODO: change to snake_case for consistency
        this.axiosRequestConfigCompl = {};
        this.axiosRequestConfigChat = {};
        this.axiosRequestConfigTools = {};
        this.axiosRequestConfigEmbeddings = {};
        this.disabledLanguages = [];
        this.languageSettings = {};
        // TODO: change to snake_case for consistency
        this.RING_UPDATE_MIN_TIME_LAST_COMPL = 3000;
        this.MIN_TIME_BETWEEN_COMPL = 600;
        this.MAX_LAST_PICK_LINE_DISTANCE = 32;
        this.MAX_QUEUED_CHUNKS = 16;
        this.DELAY_BEFORE_COMPL_REQUEST = 150;
        this.MAX_EVENTS_IN_LOG = 250;
        this.MAX_CHARS_TOOL_RETURN = 5000;
        this.uiLanguages = new Map([]);
        this.langIndexes = new Map([
            [0, "en"],
            [1, "bg"],
            [2, "de"],
            [3, "ru"],
            [4, "es"],
            [5, "cn"],
            [6, "fr"],
        ]);
        this.updateConfigs = (config) => {
            // TODO Handle the case of wrong types for the configuration values
            this.endpoint = utils_1.Utils.trimTrailingSlash(String(config.get("endpoint")));
            this.endpoint_chat = utils_1.Utils.trimTrailingSlash(String(config.get("endpoint_chat")));
            this.endpoint_tools = utils_1.Utils.trimTrailingSlash(String(config.get("endpoint_tools")));
            this.endpoint_embeddings = utils_1.Utils.trimTrailingSlash(String(config.get("endpoint_embeddings")));
            this.new_completion_model_port = Number(config.get("new_completion_model_port"));
            this.new_chat_model_port = Number(config.get("new_chat_model_port"));
            this.new_embeddings_model_port = Number(config.get("new_embeddings_model_port"));
            this.new_tools_model_port = Number(config.get("new_tools_model_port"));
            this.new_completion_model_host = String(config.get("new_completion_model_host"));
            this.new_chat_model_host = String(config.get("new_chat_model_host"));
            this.new_embeddings_model_host = String(config.get("new_embeddings_model_host"));
            this.new_tools_model_host = String(config.get("new_tools_model_host"));
            this.launch_completion = String(config.get("launch_completion"));
            this.launch_chat = String(config.get("launch_chat"));
            this.launch_embeddings = String(config.get("launch_embeddings"));
            this.launch_tools = String(config.get("launch_tools"));
            this.launch_training_completion = String(config.get("launch_training_completion"));
            this.launch_training_chat = String(config.get("launch_training_chat"));
            this.ai_model = String(config.get("ai_model"));
            this.ai_api_version = String(config.get("ai_api_version"));
            this.lora_completion = String(config.get("lora_completion"));
            this.lora_chat = String(config.get("lora_chat"));
            this.use_openai_endpoint = Boolean(config.get("use_openai_endpoint"));
            this.openai_client_model = String(config.get("openai_client_model"));
            this.openai_prompt_template = String(config.get("openai_prompt_template"));
            this.auto = Boolean(config.get("auto"));
            this.api_key = String(config.get("api_key"));
            this.api_key_chat = String(config.get("api_key_chat"));
            this.api_key_tools = String(config.get("api_key_tools"));
            this.api_key_embeddings = String(config.get("api_key_embeddings"));
            this.self_signed_certificate = String(config.get("self_signed_certificate"));
            this.n_prefix = Number(config.get("n_prefix"));
            this.n_suffix = Number(config.get("n_suffix"));
            this.n_predict = Number(config.get("n_predict"));
            this.rag_chunk_max_chars = Number(config.get("rag_chunk_max_chars"));
            this.t_max_prompt_ms = Number(config.get("t_max_prompt_ms"));
            this.t_max_predict_ms = Number(config.get("t_max_predict_ms"));
            this.show_info = Boolean(config.get("show_info"));
            this.max_line_suffix = Number(config.get("max_line_suffix"));
            this.max_cache_keys = Number(config.get("max_cache_keys"));
            this.ring_n_chunks = Number(config.get("ring_n_chunks"));
            this.ring_chunk_size = Number(config.get("ring_chunk_size"));
            this.ring_scope = Number(config.get("ring_scope"));
            this.ring_update_ms = Number(config.get("ring_update_ms"));
            this.rag_enabled = Boolean(config.get("rag_enabled"));
            this.rag_max_lines_per_chunk = Number(config.get("rag_max_lines_per_chunk"));
            this.rag_max_chars_per_chunk_line = Number(config.get("rag_max_chars_per_chunk_line"));
            this.rag_max_files = Number(config.get("rag_max_files"));
            this.rag_max_chunks = Number(config.get("rag_max_chunks"));
            this.rag_max_bm25_filter_chunks = Number(config.get("rag_max_bm25_filter_chunks"));
            this.rag_max_embedding_filter_chunks = Number(config.get("rag_max_embedding_filter_chunks"));
            this.rag_max_context_files = Number(config.get("rag_max_context_files"));
            this.rag_max_context_file_chars = Number(config.get("rag_max_context_file_chars"));
            this.tool_run_terminal_command_enabled = Boolean(config.get("tool_run_terminal_command_enabled"));
            this.tool_search_source_enabled = Boolean(config.get("tool_search_source_enabled"));
            this.tool_read_file_enabled = Boolean(config.get("tool_read_file_enabled"));
            this.tool_list_directory_enabled = Boolean(config.get("tool_list_directory_enabled"));
            this.tool_regex_search_enabled = Boolean(config.get("tool_regex_search_enabled"));
            this.tool_delete_file_enabled = Boolean(config.get("tool_delete_file_enabled"));
            this.tool_permit_some_terminal_commands = Boolean(config.get("tool_permit_some_terminal_commands"));
            this.tool_permit_file_changes = Boolean(config.get("tool_permit_file_changes"));
            this.tool_get_diff_enabled = Boolean(config.get("tool_get_diff_enabled"));
            this.tool_edit_file_enabled = Boolean(config.get("tool_edit_file_enabled"));
            this.tool_ask_user_enabled = Boolean(config.get("tool_ask_user_enabled"));
            this.tool_custom_tool_enabled = Boolean(config.get("tool_custom_tool_enabled"));
            this.tool_save_plan_enabled = Boolean(config.get("tool_save_plan_enabled"));
            this.tool_update_task_enabled = Boolean(config.get("tool_update_task_enabled"));
            this.tool_llama_vscode_help_enabled = Boolean(config.get("tool_llama_vscode_help_enabled"));
            this.tool_custom_tool_description = String(config.get("tool_custom_tool_description"));
            this.tool_custom_tool_source = String(config.get("tool_custom_tool_source"));
            this.tool_custom_eval_tool_enabled = Boolean(config.get("tool_custom_eval_tool_enabled"));
            this.tool_custom_eval_tool_property_description = String(config.get("tool_custom_eval_tool_property_description"));
            this.tool_custom_eval_tool_description = String(config.get("tool_custom_eval_tool_description"));
            this.tool_custom_eval_tool_code = String(config.get("tool_custom_eval_tool_code"));
            this.tools_max_iterations = Number(config.get("tools_max_iterations"));
            this.tools_log_calls = Boolean(config.get("tools_log_calls"));
            this.chats_max_history = Number(config.get("chats_max_history"));
            this.chats_max_tokens = Number(config.get("chats_max_tokens"));
            this.chats_summarize_old_msgs = Boolean(config.get("chats_summarize_old_msgs"));
            this.chats_msgs_keep = Number(config.get("chats_msgs_keep"));
            this.language = String(config.get("language"));
            this.disabledLanguages = config.get("disabledLanguages") || [];
            this.enabled = Boolean(config.get("enabled", true));
            this.languageSettings = config.get('languageSettings') || {};
            this.completion_models_list = config.get("completion_models_list") ?? new Array();
            this.chat_models_list = config.get("chat_models_list") ?? new Array();
            this.embeddings_models_list = config.get("embeddings_models_list") ?? new Array();
            this.tools_models_list = config.get("tools_models_list") ?? new Array();
            this.envs_list = config.get("envs_list") ?? new Array();
            this.agents_list = config.get("agents_list") ?? new Array();
            this.agent_rules = String(config.get("agent_rules"));
            this.agent_commands = config.get("agent_commands") ?? new Array();
            this.env_start_last_used = Boolean(config.get("env_start_last_used", true));
            this.tools_custom = config.get("tools_custom") ?? new Array();
            this.context_custom = config.get("context_custom") ?? {};
            this.env_start_last_used = Boolean(config.get("env_start_last_used", true));
            this.env_start_last_used_confirm = Boolean(config.get("env_start_last_used_confirm", true));
            this.ask_install_llamacpp = Boolean(config.get("ask_install_llamacpp", true));
            this.ask_upgrade_llamacpp_hours = Number(config.get("ask_upgrade_llamacpp_hours"));
        };
        this.getUiText = (uiText) => {
            let langTexts = this.uiLanguages.get(this.language);
            if (langTexts == undefined)
                langTexts = this.uiLanguages.get("en");
            return langTexts?.get(uiText);
        };
        this.updateOnEvent = (event, config) => {
            this.updateConfigs(config);
            if (event.affectsConfiguration("llama-vscode.api_key")
                || event.affectsConfiguration("llama-vscode.api_key_tools")
                || event.affectsConfiguration("llama-vscode.api_key_chat")
                || event.affectsConfiguration("llama-vscode.api_key_embeddings")
                || event.affectsConfiguration("llama-vscode.self_signed_certificate")) {
                this.setLlamaRequestConfig();
                this.setOpenAiClient();
            }
            if (event.affectsConfiguration("llama-vscode.env_start_last_used"))
                this.updateConfigValue("env_start_last_used_confirm", true);
        };
        this.isEnvViewSettingChanged = (event) => {
            return event.affectsConfiguration("llama-vscode.enabled")
                || event.affectsConfiguration("llama-vscode.rag_enabled")
                || event.affectsConfiguration("llama-vscode.env_start_last_used");
        };
        this.isRagConfigChanged = (event) => {
            return event.affectsConfiguration("llama-vscode.rag_chunk_max_chars")
                || event.affectsConfiguration("llama-vscode.rag_max_lines_per_chunk")
                || event.affectsConfiguration("llama-vscode.rag_max_files")
                || event.affectsConfiguration("llama-vscode.rag_max_chars_per_chunk_line")
                || event.affectsConfiguration("llama-vscode.rag_enabled");
        };
        this.isToolChanged = (event) => {
            return event.affectsConfiguration("llama-vscode.tool_run_terminal_command_enabled")
                || event.affectsConfiguration("llama-vscode.tool_search_source_enabled")
                || event.affectsConfiguration("llama-vscode.tool_list_directory_enabled")
                || event.affectsConfiguration("llama-vscode.tool_read_file_enabled")
                || event.affectsConfiguration("llama-vscode.tool_regex_search_enabled")
                || event.affectsConfiguration("llama-vscode.tool_custom_tool_source")
                || event.affectsConfiguration("llama-vscode.tool_custom_tool_description")
                || event.affectsConfiguration("llama-vscode.tool_custom_tool_enabled")
                || event.affectsConfiguration("llama-vscode.tool_ask_user_enabled")
                || event.affectsConfiguration("llama-vscode.tool_delete_file_enabled")
                || event.affectsConfiguration("llama-vscode.tool_edit_file_enabled")
                || event.affectsConfiguration("llama-vscode.tool_get_diff_enabled")
                || event.affectsConfiguration("llama-vscode.tool_llama_vscode_help_enabled")
                || event.affectsConfiguration("llama-vscode.tool_custom_eval_tool_enabled")
                || event.affectsConfiguration("llama-vscode.tool_custom_eval_tool_description")
                || event.affectsConfiguration("llama-vscode.tool_custom_eval_tool_property_description")
                || event.affectsConfiguration("llama-vscode.tool_update_task_enabled")
                || event.affectsConfiguration("llama-vscode.tool_save_plan_enabled")
                || event.affectsConfiguration("llama-vscode.tools_custom");
        };
        this.setLlamaRequestConfig = () => {
            this.axiosRequestConfigCompl = {};
            if (this.api_key != undefined && this.api_key.trim() != "") {
                this.axiosRequestConfigCompl = {
                    headers: {
                        Authorization: `Bearer ${this.api_key.trim()}`,
                        "Content-Type": "application/json",
                    },
                };
            }
            if (this.self_signed_certificate != undefined && this.self_signed_certificate.trim() != "") {
                const httpsAgent = new https_1.default.Agent({
                    ca: fs_1.default.readFileSync(this.self_signed_certificate.trim()),
                });
                this.axiosRequestConfigCompl = {
                    ...this.axiosRequestConfigCompl,
                    httpsAgent,
                };
            }
            this.axiosRequestConfigChat = {};
            if (this.api_key_chat != undefined && this.api_key_chat.trim() != "") {
                this.axiosRequestConfigChat = {
                    headers: {
                        Authorization: `Bearer ${this.api_key_chat.trim()}`,
                        "Content-Type": "application/json",
                    },
                };
            }
            this.axiosRequestConfigTools = {};
            if (this.api_key_tools != undefined && this.api_key_tools.trim() != "") {
                this.axiosRequestConfigTools = {
                    headers: {
                        Authorization: `Bearer ${this.api_key_tools.trim()}`,
                        "Content-Type": "application/json",
                    },
                };
            }
            this.axiosRequestConfigEmbeddings = {};
            if (this.api_key_embeddings != undefined && this.api_key_embeddings.trim() != "") {
                this.axiosRequestConfigEmbeddings = {
                    headers: {
                        Authorization: `Bearer ${this.api_key_embeddings.trim()}`,
                        "Content-Type": "application/json",
                    },
                };
            }
        };
        this.setOpenAiClient = () => {
            this.openai_client = null;
            if (this.use_openai_endpoint) {
                this.openai_client = new openai_1.default({
                    apiKey: this.api_key || "empty",
                    baseURL: this.endpoint,
                });
            }
        };
        this.isCompletionEnabled = (document, language) => {
            if (!this.enabled)
                return false;
            const languageToCheck = language ?? document?.languageId;
            if (languageToCheck) {
                return this.languageSettings[languageToCheck] ?? true;
            }
            return true;
        };
        this.updateConfigValue = async (settingName, value) => {
            await this.config.update(settingName, value, true);
        };
        this.config = vscode.workspace.getConfiguration("llama-vscode");
        this.initUiLanguages();
        this.updateConfigs(this.config);
        this.setLlamaRequestConfig();
        this.setOpenAiClient();
    }
    initUiLanguages() {
        let totalLanguages = 0;
        if (translations_1.translations.length > 0)
            totalLanguages = translations_1.translations[0].length;
        for (let langInd = 0; langInd < totalLanguages; langInd++) {
            let lang = new Map(translations_1.translations.map(transl => [transl[0], transl[langInd]]));
            this.uiLanguages.set(this.langIndexes.get(langInd) ?? "", lang);
        }
    }
}
exports.Configuration = Configuration;
//# sourceMappingURL=configuration.js.map