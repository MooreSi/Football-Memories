import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { EmptyState } from "./components/ui/EmptyState";
import { ClipExplorerPage } from "./pages/ClipExplorerPage";
import { DownloadedPage } from "./pages/DownloadedPage";
import { ReelStudioPage } from "./pages/ReelStudioPage";
import { BackupSettings } from "./components/settings/BackupSettings";
import { PlaybackSettings } from "./components/settings/PlaybackSettings";
import { StorageSettings } from "./components/settings/StorageSettings";
import { UpdateSettings } from "./components/settings/UpdateSettings";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { SettingsLayout } from "./pages/SettingsPage";
import { ImportPage } from "./pages/ImportPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { PlayerHubPage } from "./pages/PlayerHubPage";
import { ReelBuilderPage } from "./pages/ReelBuilderPage";
import { ReelsPage } from "./pages/ReelsPage";
import { PlayerPage } from "./pages/PlayerPage";
import { HudlMatchPage } from "./pages/HudlMatchPage";
import { HudlPlayerPage } from "./pages/HudlPlayerPage";
import { OpponentsPage } from "./pages/OpponentsPage";
import { ReportPage } from "./pages/ReportPage";
import { Compass } from "lucide-react";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="hudl/:id" element={<HudlMatchPage />} />
        <Route path="player/hudl/:name" element={<HudlPlayerPage />} />
        <Route path="opponents" element={<OpponentsPage />} />
        <Route path="report/match/:id" element={<ReportPage kind="match" />} />
        <Route path="report/season" element={<ReportPage kind="season" />} />
        <Route path="matches/:id" element={<MatchDetailPage />} />
        <Route path="clips" element={<ClipExplorerPage />} />
        <Route path="downloaded" element={<DownloadedPage />} />
        <Route path="clips/reel/new" element={<ReelStudioPage />} />
        <Route path="clips/reels" element={<ReelsPage />} />
        <Route path="clips/reels/:id" element={<ReelBuilderPage />} />
        <Route path="player" element={<PlayerPage />} />
        <Route path="player/choose" element={<PlayerPage choose />} />
        <Route path="player/:id" element={<PlayerHubPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<PlaybackSettings />} />
          <Route path="storage" element={<StorageSettings />} />
          <Route path="backups" element={<BackupSettings />} />
          <Route path="connections" element={<ConnectionsPage embedded />} />
          <Route path="update" element={<UpdateSettings />} />
        </Route>
        <Route path="*" element={<EmptyState icon={Compass} title="Page not found" />} />
      </Route>
    </Routes>
  );
}
