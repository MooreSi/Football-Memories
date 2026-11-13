# Changelog

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
