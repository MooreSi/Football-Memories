import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
import { MomentumChart } from '../components/match/MatchInsights';
import { NoteOverlay, activeNotes } from '../components/match/NoteLayer';

afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s: number, duration_s = 0) => ({ id, category, time_s, duration_s });
const moments = [
  t('p1', 'ROVERS POSSESSION', 0, 90), t('p2', 'OPPOSITION POSSESSION', 100, 30), t('p3', 'CONTESTED POSSESSION', 140, 20),
  t('e1', 'ROVERS MIDFIELD THIRD ENTRY', 10), t('e2', 'ROVERS ATTACKING THIRD ENTRY', 20), t('c1', 'ROVERS CHANCE', 30),
  t('g1', 'OPPOSITION GOAL', 110), t('c2', 'OPPOSITION CHANCE', 105), t('s1', 'SAM EXAMPLE', 25, 5),
];
const library = [
  { id: 'a', title: '261101 U11 v Derby County', age_group: 'U11', tag_status: 'synced', moments },
  { id: 'b', title: '251101 U10 v Derby County', age_group: 'U10', tag_status: 'synced', moments: [t('x', 'ROVERS GOAL', 1), t('y', 'OPPOSITION CHANCE', 2), t('z', 'ROVERS CHANCE', 3), t('w', 'ROVERS POSSESSION', 0, 9), t('v', 'OPPOSITION POSSESSION', 9, 9)] },
];
function open(notes: unknown[] = []) {
  const calls = stubFetch({
    'http://127.0.0.1:8766/library': library,
    'http://127.0.0.1:8766/account': { configured: true, state: 'ready', busy: false, match_id: 'a', stream_url: 'http://127.0.0.1:8766/stream/x/playlist.m3u8' },
    'http://127.0.0.1:8766/account/action': { accepted: true },
    '/api/notes': notes, '/api/scores': {}, '/api/watching': { ok: true }, '/api/players': [],
  });
  renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage />} /></Routes>, '/hudl/a');
  return calls;
}

it('shows possession as time on the ball, leaving contested time out', async () => {
  open();
  const bar = await screen.findByRole('group', { name: /Possession/ });
  expect(bar).toHaveAccessibleName('Possession: Us 75%, Derby County 25%');
  expect(bar).toHaveTextContent('contested 0m not counted');
});

it('shows the record against this opponent across meetings', async () => {
  open();
  const h2h = await screen.findByRole('region', { name: 'Head to head' });
  expect(h2h).toHaveTextContent('Against Derby County');
  expect(h2h).toHaveTextContent('2 played');
  expect(h2h).toHaveTextContent('W 1 D 0 L 1');
});

it('lists our attacks that ended in a chance as clips with their steps', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Attacks ending in a chance (1)' }));
  const list = screen.getByRole('region', { name: 'Hudl tagged moments' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  expect(within(list).getByRole('listitem')).toHaveTextContent('Chance: Midfield third entry → Attacking third entry → Chance');
  expect(screen.getByRole('button', { name: 'Play Tagged (1)' })).toBeInTheDocument();
});

it('saves a note on the moment last clicked', async () => {
  open(); const user = userEvent.setup();
  const list = await screen.findByRole('region', { name: 'Hudl tagged moments' });
  await user.click(within(list).getByRole('button', { name: /SAM EXAMPLE/ }));
  await user.click(screen.getByRole('button', { name: /Note \/ draw on 0:25 SAM EXAMPLE/ }));
  await user.type(screen.getByLabelText('Note'), 'Lovely first touch');
  await user.click(screen.getByRole('button', { name: 'Save note' }));
  const put = vi.mocked(fetch).mock.calls.find(c => String(c[0]) === '/api/notes' && c[1]?.method === 'PUT');
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({ moment_id: 's1', match_id: 'a', time_s: 25, text: 'Lovely first touch', shapes: [] });
});

it('marks moments that have a note in the list', async () => {
  open([{ moment_id: 's1', match_id: 'a', time_s: 25, text: 'Lovely first touch', shapes: [] }]);
  const list = await screen.findByRole('region', { name: 'Hudl tagged moments' });
  expect(await within(list).findByLabelText('Has a note')).toBeInTheDocument();
  expect(within(list).getByText('Lovely first touch')).toBeInTheDocument();
});

it('seeks to the first attacking moment of a clicked minute', () => {
  const onSeek = vi.fn();
  const { container } = render(<MomentumChart match={{ ...library[0], capture_key: 'a', tag_status: 'synced' }} club={null} theirs="Derby County" onSeek={onSeek} />);
  fireEvent.click(container.querySelector('rect[data-minute="1"][data-side="theirs"]')!);
  expect(onSeek).toHaveBeenCalledWith(105);
  expect(container.querySelector('rect[data-minute="1"][data-side="ours"]')).toBeNull();
});

it('shows a note only around its moment, with its drawing', () => {
  const note = { moment_id: 's1', match_id: 'a', time_s: 25, text: 'Run here', shapes: [{ kind: 'arrow' as const, x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.5 }] };
  expect(activeNotes([note], 10)).toEqual([]);
  expect(activeNotes([note], 27)).toEqual([note]);
  const { container } = render(<NoteOverlay notes={[note]} />);
  expect(screen.getByRole('note')).toHaveTextContent('Run here');
  expect(container.querySelectorAll('line[data-shape="arrow"]')).toHaveLength(1);
});
