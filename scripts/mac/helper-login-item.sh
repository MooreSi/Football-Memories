# Football Memories: start the desktop helper at login (owner request 2026-11-20).
# Sourced by "Install Football Memories.command"; tested by
# backend/tests/test_helper_login_item.py. Bash 3.2 safe.
#
# A per-user launchd login item (~/Library/LaunchAgents), not a system service.
# RunAtLoad only, no KeepAlive: the in-app updater restarts the helper in place
# (os.execv, same process), and a launchd respawn could start a second copy that
# fights it for port 8766. FM_LAUNCH_AGENTS / FM_LAUNCHCTL are for the tests.

FM_HELPER_LABEL="com.footballmemories.helper"

_fm_agents_dir() { printf '%s' "${FM_LAUNCH_AGENTS:-$HOME/Library/LaunchAgents}"; }
_fm_helper_plist() { printf '%s/%s.plist' "$(_fm_agents_dir)" "$FM_HELPER_LABEL"; }

# XML text: & first, then < and > (a folder can be called "Mum & Dad's").
_fm_xml() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

# write_helper_login_item APP_DIR INBOX: (re)write the login item for this copy.
write_helper_login_item() {
  local app inbox plist temporary
  app="$(_fm_xml "$1")"
  inbox="$(_fm_xml "$2")"
  plist="$(_fm_helper_plist)"
  mkdir -p "$(_fm_agents_dir)" || return 1
  temporary="$plist.tmp.$$"
  cat >"$temporary" <<EOF || return 1
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$FM_HELPER_LABEL</string>
	<key>ProgramArguments</key>
	<array>
		<string>$app/backend/.venv/bin/python3</string>
		<string>-m</string>
		<string>app.connectors.hudl_companion</string>
		<string>--output</string>
		<string>$inbox</string>
	</array>
	<key>WorkingDirectory</key>
	<string>$app/backend</string>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
	</dict>
	<key>RunAtLoad</key>
	<true/>
	<key>ProcessType</key>
	<string>Interactive</string>
	<key>StandardOutPath</key>
	<string>$app/data/helper.log</string>
	<key>StandardErrorPath</key>
	<string>$app/data/helper.log</string>
</dict>
</plist>
EOF
  mv -f "$temporary" "$plist"
}

# start_helper_login_item: load the login item now (it starts the helper). Only
# called when no helper answers, so unloading an old copy first stops nothing
# that is in use; it makes launchd read a rewritten file.
start_helper_login_item() {
  local launchctl domain
  launchctl="${FM_LAUNCHCTL:-launchctl}"
  domain="gui/$(id -u)"
  "$launchctl" bootout "$domain/$FM_HELPER_LABEL" >/dev/null 2>&1
  "$launchctl" bootstrap "$domain" "$(_fm_helper_plist)" >/dev/null 2>&1
}
