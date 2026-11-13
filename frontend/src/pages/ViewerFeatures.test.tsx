import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { AlertsBell } from '../components/AlertsBell';
import { ContinueWatching } from '../components/library/ContinueWatching';
import { OpponentsPage } from './OpponentsPage';
import { ReportPage } from './ReportPage';

afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s = 1, duration_s = 0) => ({ id, category, time_s, duration_s });
const H = 'http://127.0.0.1:8766';
const lib = [
  { id: 'a', title: '261101 U11 v Derby County', age_group: 'U11', capture_key: 'a', season_label: '2026-27', duration_s: 5000,
    moments: [t('1', 'PAT EXAMPLE'), t('2', 'ROVERS GOAL'), t('3', 'OPPOSITION GOAL'), t('4', 'ROVERS CHANCE'), t('5', 'OPPOSITION CHANCE'), t('6', 'ROVERS POSSESSION', 0, 30), t('7', 'OPPOSITION POSSESSION', 40, 10)] },
  { id: 'b', title: '261108 U11 v Stoke City', age_group: 'U11', capture_key: 'b', season_label: '2026-27', duration_s: 5000, moments: [t('8', 'PAT EXAMPLE'), t('9', 'PAT EXAMPLE')] },
];
const player = { primary_player_id: 5 };
const profile = { id: 5, display_name: 'Pat Example' };
const puts = () => vi.mocked(fetch).mock.calls.filter(c => c[1]?.method === 'PUT').map(c => [String(c[0]), JSON.parse(String(c[1]?.body))]);

it('records the library silently the first time, so nothing old is new', async () => {
  stubFetch({ [`${H}/library`]: lib, '/api/alerts/seen': null, '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<AlertsBell />);
  expect(await screen.findByRole('button', { name: 'No new alerts' })).toBeInTheDocument();
  await vi.waitFor(() => expect(puts()).toEqual([['/api/alerts/seen', { matches: ['a', 'b'], player: 'PAT EXAMPLE', counts: { a: 1, b: 2 } }]]));
});

it('lists new matches and new player moments, and marks them read', async () => {
  stubFetch({ [`${H}/library`]: lib, '/api/alerts/seen': { matches: ['a'], player: 'PAT EXAMPLE', counts: {} }, '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<AlertsBell />); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '2 new alerts' }));
  const dialog = screen.getByRole('dialog', { name: 'Alerts' });
  expect(within(dialog).getAllByRole('link').map(l => l.textContent)).toEqual([
    'New match261108 U11 v Stoke CityPat Example tagged 2 times', '1 new moment of Pat Example261101 U11 v Derby County']);
  expect(within(dialog).getAllByRole('link')[0]).toHaveAttribute('href', '/hudl/b?player=Pat%20Example');
  await user.click(within(dialog).getByRole('button', { name: 'Mark all as read' }));
  expect(puts().at(-1)).toEqual(['/api/alerts/seen', { matches: ['a', 'b'], player: 'PAT EXAMPLE', counts: { a: 1, b: 2 } }]);
});

it('offers unfinished matches to resume at the saved position', async () => {
  stubFetch({ '/api/watching': [{ match_id: 'b', position_s: 1234.7, duration_s: 5000, updated_at: 2 }, { match_id: 'a', position_s: 4950, duration_s: 5000, updated_at: 1 }] });
  renderWithProviders(<ContinueWatching library={lib} club="Rovers" />);
  const row = await screen.findByRole('region', { name: 'Continue watching' });
  expect(within(row).getAllByRole('link')).toHaveLength(1);
  expect(within(row).getByRole('link')).toHaveAttribute('href', '/hudl/b?t=1234');
  expect(row).toHaveTextContent('Resume at 20:34');
});

it('tabulates the record against each opponent', async () => {
  stubFetch({ [`${H}/library`]: lib, '/api/scores': { b: { ours: 0, theirs: 2 } }, '/api/players': [], '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<OpponentsPage />);
  const rows = await screen.findAllByRole('row');
  expect(rows.slice(1).map(r => within(r).getAllByRole('cell').slice(0, 6).map(c => c.textContent))).toEqual([
    [expect.stringContaining('Derby County'), '1', '0', '1', '0', '1-1'],
    [expect.stringContaining('Stoke City'), '1', '0', '0', '1', '0-2'],
  ]);
});

it('draws a match report with the score, possession and the player', async () => {
  stubFetch({ [`${H}/library`]: lib, '/api/scores': {}, '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, '/report/match/a');
  const card = await screen.findByRole('img', { name: /v Derby County, 1 November 2026/ });
  await vi.waitFor(() => expect(card).toHaveTextContent('PAT EXAMPLE'));
  expect(card).toHaveTextContent('1 - 1');
  expect(card).toHaveTextContent('75%');
  expect(screen.getByRole('button', { name: /Save image/ })).toBeInTheDocument();
});
