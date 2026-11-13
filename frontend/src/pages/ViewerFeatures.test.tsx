import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { AlertsBell } from '../components/AlertsBell';
import { ContinueWatching } from '../components/library/ContinueWatching';
import { OpponentsPage } from './OpponentsPage';
import { ReportPage } from './ReportPage';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
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

const seasonLib = [
  { id: 'w1', title: '261101 U11 v Wolves', age_group: 'U11', age_groups: ['U11'], capture_key: 'w1', season_label: '2026/27', moments: [t('1', 'ROVERS GOAL'), t('2', 'ROVERS CHANCE'), t('3', 'OPPOSITION CHANCE'), t('4', 'ROVERS POSSESSION', 0, 5), t('5', 'OPPOSITION POSSESSION', 6, 5)] },
  { id: 'w2', title: '261108 U11 v Wolves', age_group: 'U11', age_groups: ['U11'], capture_key: 'w2', season_label: '2026/27', moments: [] },
  { id: 'w3', title: '251101 U10 v Wolves', age_group: 'U10', age_groups: ['U10'], capture_key: 'w3', season_label: '2025/26', moments: [] },
  { id: 'x1', title: '261101 U10 v Wolves', age_group: 'U10', age_groups: ['U10'], capture_key: 'x1', season_label: '2026/27', moments: [] },
  { id: 'x2', title: '261102 U10 v Stoke City', age_group: 'U10', age_groups: ['U10'], capture_key: 'x2', season_label: '2026/27', moments: [] },
];
function openOpponents(route = '/opponents') {
  localStorage.clear();
  stubFetch({ [`${H}/library`]: seasonLib, '/api/scores': { w3: { ours: 0, theirs: 2 } }, '/api/players': [], '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<Routes><Route path="/opponents" element={<OpponentsPage />} /></Routes>, route);
}
const rowTexts = () => [...screen.getByRole('list', { name: 'Opponents' }).querySelectorAll('summary')].map(s => s.textContent);

it('follows one team across seasons and leaves out the other age groups', async () => {
  openOpponents('/opponents?age=U11&season=2026/27');
  await screen.findByRole('list', { name: 'Opponents' });
  expect(screen.getByText(/U11 in 2026\/27, the same team as U10 in 2025\/26/)).toBeInTheDocument();
  expect(rowTexts()).toEqual([expect.stringMatching(/^Wolverhampton Wanderers31011-2/)]);
});

it('splits each club by season with every game, and filters to one season', async () => {
  openOpponents('/opponents?age=U11&season=2026/27'); const user = userEvent.setup();
  await screen.findByRole('list', { name: 'Opponents' });
  await user.click(screen.getByText('Wolverhampton Wanderers'));
  const older = screen.getByRole('region', { name: 'Wolverhampton Wanderers 2025/26' });
  expect(older).toHaveTextContent('2025/26 · U10');
  expect(within(older).getAllByRole('link').map(l => l.getAttribute('href'))).toEqual(['/hudl/w3']);
  expect(within(screen.getByRole('region', { name: 'Wolverhampton Wanderers 2026/27' })).getAllByRole('link')).toHaveLength(2);
  await user.selectOptions(screen.getByLabelText('Season'), '2025/26');
  expect(screen.getByLabelText('Age group')).toHaveValue('U10');
  expect(rowTexts()).toEqual([expect.stringMatching(/^Wolverhampton Wanderers10010-2/)]);
});

it('starts on the team your player plays in, not the busiest age group', async () => {
  localStorage.clear();
  const lib2 = [...seasonLib.map(m => m.id === 'w2' ? { ...m, moments: [t('pp', 'PAT EXAMPLE')] } : m),
    { id: 'x3', title: '261103 U10 v Town', age_group: 'U10', age_groups: ['U10'], capture_key: 'x3', season_label: '2026/27', moments: [] }];
  stubFetch({ [`${H}/library`]: lib2, '/api/scores': {}, '/api/players': [], '/api/preferences': player, '/api/players/5': { id: 5, display_name: 'Pat Example' } });
  renderWithProviders(<Routes><Route path="/opponents" element={<OpponentsPage />} /></Routes>, '/opponents');
  await screen.findByRole('list', { name: 'Opponents' });
  expect(screen.getByLabelText('Age group')).toHaveValue('U11');
});

it('keeps the chosen team and switches to a younger one by age group', async () => {
  openOpponents('/opponents?age=U11&season=2026/27'); const user = userEvent.setup();
  await screen.findByRole('list', { name: 'Opponents' });
  await user.selectOptions(screen.getByLabelText('Age group'), 'U10');
  expect(rowTexts().map(t => t?.split(/\d/)[0])).toEqual(['Stoke City', 'Wolverhampton Wanderers']);
  expect(localStorage.getItem('fm.opponents.team')).toBe(String(2026 - 10));
});

it('draws a match report with the score, possession and the player', async () => {
  stubFetch({ [`${H}/library`]: lib, '/api/scores': {}, '/api/preferences': player, '/api/players/5': profile, '/api/team-logo': {} });
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, '/report/match/a');
  const card = await screen.findByRole('img', { name: /v Derby County, 1 November 2026/ });
  await vi.waitFor(() => expect(card).toHaveTextContent('PAT EXAMPLE'));
  expect(card).toHaveTextContent('1 - 1');
  expect(card).toHaveTextContent('75%');
  expect(screen.getByRole('button', { name: /Save image/ })).toBeInTheDocument();
  expect(card.querySelectorAll('[data-crest]')).toHaveLength(2);
  // No club is set here, so ours stays initials; the opponent's crest is embedded.
  await vi.waitFor(() => expect(card.querySelectorAll('[data-crest=image] image')).toHaveLength(1));
  expect(card.querySelector('[data-crest=image] image')!.getAttribute('href')).toMatch(/^data:/);
  expect(vi.mocked(fetch).mock.calls.map(c => String(c[0])).filter(u => u.startsWith('/api/team-logo'))).toEqual(
    expect.arrayContaining(['/api/team-logo?name=Derby%20County']));
});

it('keeps a crest as initials when none is found, and puts long season values on their own lines', async () => {
  const teammates = ['Chris Demo', 'Alex Sample', 'Jo Tester', 'Robin Mock'].map((n, i) => t(`p${i}`, n.toUpperCase(), 1, 2));
  const big = [{ ...lib[0], moments: [...lib[0].moments!.map(m => ({ ...m, duration_s: m.duration_s || 2 })), ...teammates] }];
  stubFetch({ [`${H}/library`]: big, '/api/scores': {}, '/api/preferences': player, '/api/players/5': profile });
  renderWithProviders(<Routes><Route path="/report/season" element={<ReportPage kind="season" />} /></Routes>, '/report/season');
  const card = await screen.findByRole('img', { name: /U11 · 2026-27/ });
  await vi.waitFor(() => expect(card).toHaveTextContent('Plays alongside'));
  expect(card.querySelector('[data-crest=initials]')).not.toBeNull();
  expect(card.querySelector('[data-row=stacked]')).toHaveTextContent('Plays alongside');
});

it('shows only the last three matches still being watched, newest first', async () => {
  const five = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id, i) => ({ id, title: `26110${i + 1} U11 v Club ${i}`, age_group: 'U11', capture_key: id, duration_s: 5000, moments: [] }));
  stubFetch({ '/api/watching': five.map((m, i) => ({ match_id: m.id, position_s: 600 + i, duration_s: 5000, updated_at: 10 - i })) });
  renderWithProviders(<ContinueWatching library={five} club="Rovers" />);
  const row = await screen.findByRole('region', { name: 'Continue watching' });
  expect(within(row).getAllByRole('link').map(l => l.getAttribute('href'))).toEqual(['/hudl/m1?t=600', '/hudl/m2?t=601', '/hudl/m3?t=602']);
});
