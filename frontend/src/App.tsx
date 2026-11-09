import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { EmptyState } from "./components/ui/EmptyState";
import { ClipExplorerPage } from "./pages/ClipExplorerPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { ImportPage } from "./pages/ImportPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { PlayerHubPage } from "./pages/PlayerHubPage";
import { PlayerPage } from "./pages/PlayerPage";
import { Compass } from "lucide-react";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="matches/:id" element={<MatchDetailPage />} />
        <Route path="clips" element={<ClipExplorerPage />} />
        <Route path="player" element={<PlayerPage />} />
        <Route path="player/choose" element={<PlayerPage choose />} />
        <Route path="player/:id" element={<PlayerHubPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings/connections" element={<ConnectionsPage />} />
        <Route path="*" element={<EmptyState icon={Compass} title="Page not found" />} />
      </Route>
    </Routes>
  );
}
