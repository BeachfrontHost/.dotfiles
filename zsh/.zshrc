# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
#if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
#  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
#fi

# Set the directory we want to store zinit and plugins
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"

# Download Zinit, if it's not there yet
if [ ! -d "$ZINIT_HOME" ]; then
	mkdir -p "$(dirname $ZINIT_HOME)"
	git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi

# Source/Load zinit
source "${ZINIT_HOME}/zinit.zsh"

# Add in Powerlevel10k
#zinit ice depth=1; zinit light romkatv/powerlevel10k

# Add in zsh plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab
zinit light MichaelAquilina/zsh-you-should-use
#zinit light spaceship-prompt/spaceship-prompt

# Add in snippets
zinit snippet OMZL::git.zsh
zinit snippet OMZP::git
zinit snippet OMZP::sudo
zinit snippet OMZP::command-not-found
zinit snippet OMZP::ansible

# Load completions
autoload -Uz compinit && compinit

zinit cdreplay -q

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# Keybindings
bindkey -v # vi mode

bindkey '^f' autosuggest-accept
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward
bindkey '^[w' kill-region


# History
HISTSIZE=10000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

#source ~/.local/share/fzf/key-bindings.zsh
#source ~/.local/share/fzf/completion.zsh

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'ls --color $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'ls --color $realpath'

# Aliases
#alias ls='ls --color'
alias oldls='ls --color'
alias olddu='du'
alias ls='eza --icons'
alias lsl='eza -l --icons -a'

alias du='dust'
alias df='duf'
alias vim='nvim'
alias mutt='neomutt'
alias c='clear'
alias wh='whois'
alias ns='nslookup'
alias sshnemo="ssh nemo"
alias nemofs="sshfs nemo:/ ~/nemo -o sftp_server=\"/usr/bin/sudo /usr/libexec/openssh/sftp-server\""
alias sshlucy="ssh lucy"
alias sshstorbox="ssh u322017.your-storagebox.de"
alias sshhetzpmve="ssh pmve.mazpc.net"
alias sshfw2="ssh fw2.mazpc.net"
alias sshspeedyg="ssh speedyg"
alias sshpve="ssh root@pve.mazpc.net"
alias sshrouter="ssh router.mazpc.net"
alias sshfrigate="ssh -i ~/.ssh/frigate_ed25519 root@frigate.mazpc.net"
alias sshha="ssh ha.mazpc.net"
alias ssh66="ssh 66.mazpc.net"

export PATH="$PATH:/home/cswarts/.local/bin"
export EDITOR=/usr/bin/nvim
export VISUAL=/usr/bin/nvim

# Shell integrations
eval "$(fzf --zsh)"
#eval "$(fzf)"
eval "$(zoxide init --cmd cd zsh)"
eval $(thefuck --alias fuck)

eval "$(starship init zsh)"

#eval "$(oh-my-posh init zsh --config ~/.config/oh-my-posh/theme.omp.toml)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"

# Added by LM Studio CLI (lms)
export PATH="$PATH:/home/cswarts/.lmstudio/bin"
# End of LM Studio CLI section

