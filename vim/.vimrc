execute pathogen#infect()
filetype plugin indent on       " Allow plugins to determine indentation
syntax enable                   " Enable syntax highlighting
set autoindent                  " Copy indent from current line on <CR>
set backspace=indent,eol,start  " Backspace behaviour
set cursorline                  " Highlight cursor line
set encoding=utf-8              " Set character encoding
set expandtab                   " Expand tabs to spaces
set hlsearch                    " Highlight all search results
set ignorecase                  " Ignore case when searching
set incsearch                   " Show matches when searching
set linebreak                   " Break lines at word
set number                      " Show line number
set shiftwidth=4                " Number of spaces to use for indent
set showbreak=+++               " Broken line prefix
set showmatch                   " Highlight matching braces
set smartcase                   " Enable smart-case search
set smartindent                 " Enable smart-indent
set smarttab                    " Enable smart-tab
set softtabstop=4               " Number of spaces per Tab
set ruler                       " Show line and column number
" set textwidth=100               " Line wrap
set undolevels=1000             " Number of undo levels
set visualbell                  " Use visual bell (silence system bell)
let g:gruvbox_italic=1
colorscheme gruvbox
set background=dark
let g:airline_powerline_fonts = 1 
let g:airline#extensions#tabline#enabled = 1 " Enable the list of buffers
" ~/full/path-to/file-name.js
let g:airline#extensions#tabline#formatter = 'default'  " f/p/file-name.js
let g:airline#extensions#tabline#formatter = 'jsformatter' " path-to/f
let g:airline#extensions#tabline#formatter = 'unique_tail' " file-name.js
let g:airline#extensions#tabline#formatter = 'unique_tail_improved' " f/p/file-name.js
let g:airline_theme='gruvbox'
let g:codeium_enabled = v:false
nnoremap <F5> :UndotreeToggle<CR>
