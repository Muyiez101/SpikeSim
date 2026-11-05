# Sumo on the same Wi-Fi

One computer hosts the room. Two students can use browsers, desktop apps or one of
each. No online account or cloud service is required.

The sumo screen separates room setup, the block strategy and the arena. The arena
shows the round, remaining time, each player's name/readiness, your own seat and
the result. **Expand arena** opens just the match in a keyboard-accessible dialog;
Escape returns to the editor without replacing its blocks. A narrow laptop stacks
the arena above the editor. The preview and a disconnected match are labelled so
their robot positions are not mistaken for a live round.

1. Build the app with `npm run build`. For a browser host, run `npm run sumo:host`
   and open the local link printed by that command. In the installed desktop app,
   choose **Sumo together**, then **Host a match**.
2. Enter a name and create a room. Copy its invitation link and six-character code
   to the second student. They must be on the same network and open that host link.
   Desktop clients can discover a room by code; the host link is a fallback.
3. Both students edit their blocks, or use **Load border-aware example**, then
   choose **Ready to compete**. The host starts after both are ready and connected.
4. A round lasts up to 60 seconds. Push the other robot's centre out of the 200 cm
   ring. A timeout is a draw. **New round** requires both students to ready again.

**Save sumo blocks** downloads the program; **Open sumo blocks** restores it.
`npm run sumo:export` exports the demonstrated Blue border-aware strategy, the Teal
20% drive strategy, and a separate four-dummy practice `.rlproj`.

The host serves built assets only. TCP 41864 is the browser host's default port;
desktop discovery uses UDP 41863. Wi-Fi client isolation and firewall settings can
prevent students connecting even on the same Wi-Fi name. Keep the host awake and
the match pages active. A missing player stops the round after the disconnect
window; a disconnected page shows that its displayed frame is no longer live.

The same host also serves the regular workspace and Learn. Its embedded simulator
uses its own content policy, while the main app keeps its strict script policy.
Lesson videos and captions are served with their media types. Byte-range streaming
lets students jump within a recording without buffering a complete video on the
host for each request. Production fonts remain bundled files so they work under
that policy.

Both robots have equal hardware: A/B drive, D/F downward colour, E forward distance.
Red is the boundary marker. Supported loops, decisions, readings, variables and
parameterless My Blocks run in a bounded host worker. Unsupported blocks and My
Block parameters are explained instead of being silently skipped. The main editor
still offers the complete block set for regular simulations.

The host owns one authoritative state. This sumo mode uses simplified planar
rectangle contact and linear impulses, not the Gears 3D physics engine. It is a
classroom programming competition, not a prediction of a physical sumo robot.

Two isolated browser sessions on one computer have been tested, including a join
through its LAN address, matching final poses/results, reload and rematch. A second
physical computer still needs acceptance testing. Native desktop/classroom-worker
checks and installation status are recorded in [desktop acceptance](packaging.md);
they do not verify discovery or firewall behavior between physical devices.

Teacher-controlled competitions, teams, three sumo ring sizes and adjustable
timers are available separately in [Class competitions](teacher-competitions.md).
They do not change the original two-player sumo room's fixed rules.
