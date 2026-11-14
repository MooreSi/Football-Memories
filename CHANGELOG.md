# Changelog

## Unreleased

## 0.4 (2026-11-14)

### New
- **Veo connection**: save your Veo account (kept in the Keychain on Mac or
  Credential Manager on Windows), connect, and read your Veo matches with their
  highlights and posters. Veo matches sit beside Hudl ones in All matches and Clips.
- **Veo match page**: watch a Veo match through the desktop helper on this
  computer or any device on your Wi-Fi, step through the highlights (N and B),
  tick highlights to play back to back, download them as one video or separate
  files, or download the full match.
- **Veo team stats**: Veo's own detected events split by team (goals, attempts,
  corners, fouls, free kicks, throw-ins, goal kicks) and a goals-and-shots
  timeline; click a dot to watch from there.
- **Highlight reels from Veo matches**, with the Veo team name on the cards.
- **Drawing board** on every match: pen, arrows, runs, zones, labels and player
  markers in six colours, with undo, a move tool and a PNG screenshot. Drawings
  are saved and replay over the video.
- **Next / previous tagged moment** buttons, the N and B keys, and the keyboard's
  media keys.
- **My Player**: records and streaks, a season story, a milestones timeline, the
  top 5 moments (make them into a reel in one click) and an opponent map.
- **Import a video from the browser**: drop a match video on the Import page or
  choose it from a folder; it is saved in the import folder, never replacing a file.
- **Home network address** on Settings > Connections, for phones and tablets.
- **Show Hudl / Show Veo** switches choose which matches the Library and Clips
  list. With only Veo shown, the Library's featured match, latest match,
  overview and recent moments come from Veo.

### Better
- Club crests: a wider search (Wikipedia search and Wikimedia Commons), a "find
  the crest on the web" link, and paste or drop a crest image in Settings.
- The Your player card shows the club crest; My Player's Teams panel is narrower
  and the totals are larger.
- Veo has a Disconnect button whenever an account is saved.

### Fixed
- Veo matches now play in Safari and on other devices on the home network.
- Next / previous moment goes to the moment after (or before) the one
  outlined, in match order; moments at the same second are no longer skipped.
- A moment you skipped from no longer keeps a second outline, and the green
  outline on the playing moment is drawn all the way round.
- Continue watching shows only the last three matches.

## 0.3 (2026-11-13)

### New
- **Match insights** on every match: possession worked out from how long each
  side had the ball, a minute-by-minute **momentum** chart (click a bar to watch
  that minute), and your record against the opponent.
- **Attacks ending in a chance**: every attack that ended in a chance or goal as
  one clip, ready to play back to back, download or make into a reel.
- **Player hub insights**: what your player was on the pitch during (attacking,
  defending, set pieces), a **football journey** season by season, who he
  **plays alongside most**, and the attacks he was in.
- **Opponents**: your record against every club for one team, followed as it
  moves up an age group each season (U11 in 2026/27 is U10 in 2025/26), split
  by season with every game listed.
- **Shareable reports**: a match or season report with club crests, saved as an
  image or printed to PDF.
- **Notes and drawings** on any moment: a note plus arrows or lines over the
  video, shown again when that moment plays.
- **Alerts**: a bell for new matches and new moments of your player.
- **Continue watching** on the Library, resuming each match where you stopped.

### Better
- The same tag in different spellings ("&amp;" and "&", "CHRIS DEMO" and
  "Chris Demo") now counts as one, and player names read "Chris Demo".
- The Match Profile's possession point shows time on the ball, not a count of tags.

### Fixed
- Header labels no longer wrap at smaller desktop widths.

## 0.2 (2026-11-13)

### New
- **Match scores** from goal tags on the hero, Latest match panel and match
  page, with your own correction when the tags are wrong.
- **Match Profile** on the Library: the tag radar split by team, following the
  match shown in the hero.
- **Plex and other media players**: downloads carry their title, date,
  description and player, and an optional **Media library** folder gives each
  download a poster and details. Seasons are written 2026-27 so Plex does not
  split them, and copies are dated on the match day.
- **Downloaded > Delete**, with a confirmation, moves a file to the Trash
  (Recycle Bin on Windows).
- **Batch download** can make one highlight reel per match.
- **Update now** restarts the app and reloads the page when it is done, and a
  copy downloaded as a ZIP can now update itself.

### Better
- **Opponents and crests**: nicknames, short forms and cut-off names in Hudl
  titles ("The Hammers", "Bluebirds", "Man City", "Shrewsbury Tow") are read as
  the full club, and "Arsenal v Aston Villa" or "Barcelona 3-0 Aston Villa"
  names the right opponent. Crests no longer go missing for a day when
  Wikipedia asks the app to slow down.
- Our side is named from your player's **Plays for**, so a fresh install no
  longer shows "Home vs. ...".
- My Player names the game under each recent-match bar.

### Fixed
- Saving to a **network share** (NAS) without hard links, for exports, reels
  and the media library.
- When a batch stops, the message names the cause.
- Installers always write a database password and the database accepts it;
  the Windows installer sets up WSL 2 first and gets past Smart App Control.

## 0.1 (2026-11-11)

The first release: match Library with club crests, Hudl connection (stream,
tagged moments, downloads), Clips with batch download, Highlight reel studio,
Downloaded tab, My Player with a memories timeline, Import from folder,
Settings with one-click Update, and phone and tablet access on your home
network.
