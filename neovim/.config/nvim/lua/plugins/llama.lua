return {
  "ggml-org/llama.vim",
  enabled = false,
  init = function()
    vim.g.llama_config = {
      show_info = false,
    }
  end,
}
