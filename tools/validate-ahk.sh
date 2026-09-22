#!/usr/bin/env bash
# Syntax-check the AutoHotkey scripts in tools/ by running the real AutoHotkey v2 parser under Wine.
#
# Worth the trouble: this repo shipped a script that would not load at all - a settings array named
# HARVEST above a function named Harvest(), which AutoHotkey rejects because names are
# case-insensitive. Every JavaScript test passed. The first anyone knew was an error box on the
# user's machine. /validate parses and exits without running anything, so it catches that class
# outright.
#
# Exit 0 all valid, 1 a script failed to parse, 2 the toolchain is not installed here.
set -uo pipefail

AHK="${AHK_EXE:-$HOME/.local/share/ahk/AutoHotkey64.exe}"
export WINEPREFIX="${WINEPREFIX:-$HOME/.wineprefix}"
export WINEDEBUG=-all

if ! command -v wine64 >/dev/null 2>&1 || [ ! -f "$AHK" ]; then
  echo "ahk: validator not installed (need wine64 and $AHK); skipping" >&2
  exit 2
fi

rc=0
shopt -s nullglob
for f in "$(dirname "$0")"/*.ahk; do
  # /validate parses and exits. It does NOT run the script, so no hotkey is ever registered here.
  if timeout 120 wine64 "$AHK" /validate /ErrorStdOut "$(readlink -f "$f")" 2>/dev/null; then
    echo "ahk ok    $(basename "$f")"
  else
    echo "ahk FAIL  $(basename "$f")  (AutoHotkey rejected it; run it on Windows for the line number)"
    rc=1
  fi
done
exit $rc
