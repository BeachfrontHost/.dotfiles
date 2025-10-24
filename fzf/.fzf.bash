# Setup fzf
# ---------
if [[ ! "$PATH" == */home/cswarts/.fzf/bin* ]]; then
  PATH="${PATH:+${PATH}:}/home/cswarts/.fzf/bin"
fi

eval "$(fzf --bash)"
