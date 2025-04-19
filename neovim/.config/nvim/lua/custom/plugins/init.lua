-- You can add your own plugins here or in other files in this directory!
--  I promise not to create any merge conflicts in this directory :)
--
-- See the kickstart.nvim README for more information
return {
  'christoomey/vim-tmux-navigator', -- tmux & split window navigation
  'junegunn/fzf', { 'do': { -> fzf#install() } }
  'junegunn/fzf.vim'
  lazy = false,
}
