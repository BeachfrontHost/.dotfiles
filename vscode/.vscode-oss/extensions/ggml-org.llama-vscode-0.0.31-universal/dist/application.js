"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const configuration_1 = require("./configuration");
const extra_context_1 = require("./extra-context");
const llama_server_1 = require("./llama-server");
const lru_cache_1 = require("./lru-cache");
const architect_1 = require("./architect");
const statusbar_1 = require("./statusbar");
const menu_1 = require("./menu");
const completion_1 = require("./completion");
const logger_1 = require("./logger");
const chat_with_ai_1 = require("./chat-with-ai");
const text_editor_1 = require("./text-editor");
const chat_context_1 = require("./chat-context");
const prompts_1 = require("./prompts");
const git_1 = require("./git");
const tools_1 = require("./tools");
const llama_agent_1 = require("./llama-agent");
const llama_webview_provider_1 = require("./llama-webview-provider");
const persistence_1 = require("./persistence");
const model_service_1 = require("./services/model-service");
const hf_model_strategy_1 = require("./services/hf-model-strategy");
const local_model_strategy_1 = require("./services/local-model-strategy");
const external_model_strategy_1 = require("./services/external-model-strategy");
const env_service_1 = require("./services/env-service");
const agent_service_1 = require("./services/agent-service");
class Application {
    constructor(context) {
        this.configuration = new configuration_1.Configuration();
        this.llamaServer = new llama_server_1.LlamaServer(this);
        this.extraContext = new extra_context_1.ExtraContext(this);
        this.lruResultCache = new lru_cache_1.LRUCache(this.configuration.max_cache_keys);
        this.architect = new architect_1.Architect(this);
        this.statusbar = new statusbar_1.Statusbar(this);
        this.menu = new menu_1.Menu(this);
        this.completion = new completion_1.Completion(this);
        this.logger = new logger_1.Logger(this);
        this.askAi = new chat_with_ai_1.ChatWithAi(this);
        this.textEditor = new text_editor_1.TextEditor(this);
        this.chatContext = new chat_context_1.ChatContext(this);
        this.prompts = new prompts_1.Prompts(this);
        this.git = new git_1.Git(this);
        this.tools = new tools_1.Tools(this);
        this.llamaAgent = new llama_agent_1.LlamaAgent(this);
        this.llamaWebviewProvider = new llama_webview_provider_1.LlamaWebviewProvider(context.extensionUri, this, context);
        this.persistence = new persistence_1.Persistence(this, context);
        // strategies should be initialized before modelService constructor as they are needed there.
        this.hfModelStrategy = new hf_model_strategy_1.HfModelStrategy(this);
        this.localModelStrategy = new local_model_strategy_1.LocalModelStrategy(this);
        this.externalModelStrategy = new external_model_strategy_1.ExternalModelStrategy(this);
        this.modelService = new model_service_1.ModelService(this);
        this.envService = new env_service_1.EnvService(this);
        this.agentService = new agent_service_1.AgentService(this);
    }
    static getInstance(context) {
        if (!Application.instance) {
            Application.instance = new Application(context);
        }
        return Application.instance;
    }
}
exports.Application = Application;
//# sourceMappingURL=application.js.map