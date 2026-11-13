import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
import { nextMoment } from '../lib/taggedPlayback';

afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s: number) => ({ id, category, time_s, duration_s: 4 });
const moments = [t('a1', 'SAM EXAMPLE', 30), t('a2', 'ROVERS CHANCE', 10), t('a3', 'SAM EXAMPLE', 90)];
function open() {
  stubFetch({
    'http://127.0.0.1:8766/library': [{ id: 'a', title: '261101 U11 v Derby County', age_group: 'U11', tag_status: 'synced', moments }],
    'http://127.0.0.1:8766/account': { configured: true, state: 'ready', busy: false, match_id: 'a', stream_url: 'http://127.0.0.1:8766/stream/x/playlist.m3u8' },
    'http://127.0.0.1:8766/account/action': { accepted: true },
    '/api/notes': [], '/api/scores': {}, '/api/watching': { ok: true }, '/api/players': [],
  });
  renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage />} /></Routes>, '/hudl/a');
}
const current = () => within(screen.getByRole('region', { name: 'Hudl tagged moments' })).getAllByRole('listitem').find(li => li.getAttribute('aria-current'));

it('finds the next and previous tagged moment from where the video is', () => {
  expect(nextMoment(moments, 30, 1)?.id).toBe('a3');
  expect(nextMoment(moments, 30, -1)?.id).toBe('a2');
  expect(nextMoment(moments, 95, 1)).toBeUndefined();
  expect(nextMoment(moments, 31, -1)?.id).toBe('a1');
});

it('outlines a moment in green when it is clicked, not only when Play Tagged reaches it', async () => {
  open(); const user = userEvent.setup();
  const list = await screen.findByRole('region', { name: 'Hudl tagged moments' });
  expect(current()).toBeUndefined();
  await user.click(within(list).getByRole('button', { name: /ROVERS CHANCE/i }));
  expect(current()).toHaveTextContent('ROVERS CHANCE');
});

it('skips to the next tagged moment with the button or the N key, in the chosen code', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Next tagged moment/ }));
  expect(current()).toHaveTextContent('0:10');
  await user.keyboard('n');
  expect(current()).toHaveTextContent('0:30');
  await user.click(screen.getAllByRole('button', { name: /^Sam Example/ })[0]);
  await user.keyboard('n');
  expect(current()).toHaveTextContent('1:30');
  await user.keyboard('b');
  expect(current()).toHaveTextContent('0:30');
});

// Owner report 2026-11-13: Next skipped moments and two tiles looked highlighted.
it('steps from the highlighted moment, not from where the video has played to', () => {
  const list = [t('x', 'RAMY', 7), t('y', 'KICK OFF', 9), t('z', 'THEO', 9), t('w', 'PRESSING', 13), t('v', 'CONTESTED', 47)];
  expect(nextMoment(list, 40, 1, 'x')?.id).toBe('y'); // the video ran on to 0:40; next is still 0:09
  expect(nextMoment(list, 9, 1, 'y')?.id).toBe('z'); // same second, not skipped
  expect(nextMoment(list, 9, 1, 'z')?.id).toBe('w');
  expect(nextMoment(list, 9, -1, 'z')?.id).toBe('y');
  expect(nextMoment(list, 13, 1, 'v')).toBeUndefined();
});

it('leaves only the new moment highlighted after skipping from a clicked one', async () => {
  open(); const user = userEvent.setup();
  const list = await screen.findByRole('region', { name: 'Hudl tagged moments' });
  const clicked = within(list).getByRole('button', { name: /ROVERS CHANCE/i });
  await user.click(clicked);
  expect(clicked).toHaveFocus();
  await user.keyboard('n');
  expect(current()).toHaveTextContent('0:30');
  expect(within(list).getAllByRole('listitem').filter(li => li.getAttribute('aria-current'))).toHaveLength(1);
  expect(list.contains(document.activeElement) && document.activeElement !== document.body).toBe(false);
});
