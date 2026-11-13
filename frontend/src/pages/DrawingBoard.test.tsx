import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';

// Spec 240: the drawing board under the match video.
afterEach(() => vi.unstubAllGlobals());
const moments = [{ id: 's1', category: 'SAM EXAMPLE', time_s: 25, duration_s: 5 }];
const library = [{ id: 'a', title: '261101 U11 v Derby County', age_group: 'U11', tag_status: 'synced', moments }];

function open(notes: unknown[] = []) {
  stubFetch({
    'http://127.0.0.1:8766/library': library,
    'http://127.0.0.1:8766/account': { configured: true, state: 'ready', busy: false, match_id: 'a', stream_url: 'http://127.0.0.1:8766/stream/x/playlist.m3u8' },
    'http://127.0.0.1:8766/account/action': { accepted: true },
    '/api/notes': notes, '/api/scores': {}, '/api/watching': { ok: true }, '/api/players': [],
  });
  renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage />} /></Routes>, '/hudl/a');
}

/** Drags across the drawing area, in 0..1 of its width and height. */
function drag(from: [number, number], to: [number, number]) {
  const area = screen.getByRole('img', { name: 'Drawing area' });
  area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1600, height: 900, right: 1600, bottom: 900, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerDown(area, { clientX: from[0] * 1600, clientY: from[1] * 900, pointerId: 1 });
  fireEvent.pointerMove(area, { clientX: to[0] * 1600, clientY: to[1] * 900, pointerId: 1 });
  fireEvent.pointerUp(area, { clientX: to[0] * 1600, clientY: to[1] * 900, pointerId: 1 });
}

const lastPut = () => {
  const puts = vi.mocked(fetch).mock.calls.filter(c => String(c[0]) === '/api/notes' && c[1]?.method === 'PUT');
  return JSON.parse(String(puts.at(-1)?.[1]?.body));
};

it('draws on the frame on screen and saves it as data keyed by match and time', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Draw on video' }));
  const tools = screen.getByRole('toolbar', { name: 'Drawing tools' });
  await user.click(within(tools).getByRole('button', { name: /Dashed run/ }));
  drag([0.25, 0.5], [0.5, 0.5]);
  await user.click(within(tools).getByRole('button', { name: 'Save drawing' }));
  expect(lastPut()).toEqual({ moment_id: 'frame:a:0.0', match_id: 'a', time_s: 0, text: '',
    shapes: [{ kind: 'dashed', x1: 0.25, y1: 0.5, x2: 0.5, y2: 0.5, colour: '#facc15', width: 2 }] });
});

it('picks tools by key, and undo, redo and the eraser change what is kept', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Draw on video' }));
  const tools = screen.getByRole('toolbar', { name: 'Drawing tools' });
  await user.keyboard('l');
  expect(within(tools).getByRole('button', { name: /^Line/ })).toHaveAttribute('aria-pressed', 'true');
  drag([0.1, 0.1], [0.4, 0.1]);
  drag([0.1, 0.6], [0.4, 0.6]);
  await user.click(within(tools).getByRole('button', { name: /Undo/ }));
  expect(document.querySelectorAll('[aria-label="Drawing area"] [data-shape="line"]')).toHaveLength(1);
  await user.click(within(tools).getByRole('button', { name: /Redo/ }));
  await user.keyboard('e');
  fireEvent.pointerDown(document.querySelectorAll('[aria-label="Drawing area"] [data-shape="line"]')[0]);
  await user.click(within(tools).getByRole('button', { name: 'Save drawing' }));
  expect(lastPut().shapes).toEqual([{ kind: 'line', x1: 0.1, y1: 0.6, x2: 0.4, y2: 0.6, colour: '#facc15', width: 2 }]);
});

it('numbers player markers in the order they are placed', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Draw on video' }));
  await user.keyboard('m');
  drag([0.2, 0.2], [0.2, 0.2]);
  drag([0.6, 0.4], [0.6, 0.4]);
  await user.click(screen.getByRole('button', { name: 'Save drawing' }));
  expect(lastPut().shapes.map((s: { label: string }) => s.label)).toEqual(['1', '2']);
});

it('lists saved drawings under the video and opens the one on screen to edit', async () => {
  open([{ moment_id: 'frame:a:0.0', match_id: 'a', time_s: 0, text: 'Hold the line', shapes: [{ kind: 'line', x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.1 }] }]);
  const user = userEvent.setup();
  expect(await screen.findByRole('button', { name: 'Go to drawing at 0:00' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Draw on video' }));
  expect(screen.getByLabelText('Note')).toHaveValue('Hold the line');
  await user.click(screen.getByRole('button', { name: /Remove drawing/ }));
  expect(lastPut()).toEqual({ moment_id: 'frame:a:0.0', match_id: 'a', time_s: 0, text: '', shapes: [] });
});

it('offers a screenshot of the frame with its drawing', async () => {
  open();
  expect(await screen.findByRole('button', { name: 'Download screenshot' })).toBeEnabled();
});

it('moves a mark with the move tool', async () => {
  open(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Draw on video' }));
  await user.keyboard('l');
  drag([0.1, 0.1], [0.3, 0.1]);
  await user.click(screen.getByRole('button', { name: /^Move/ }));
  const mark = document.querySelector('[aria-label="Drawing area"] [data-shape="line"]')!;
  fireEvent.pointerDown(mark, { clientX: 0.2 * 1600, clientY: 0.1 * 900, pointerId: 1 });
  const area = screen.getByRole('img', { name: 'Drawing area' });
  fireEvent.pointerMove(area, { clientX: 0.4 * 1600, clientY: 0.3 * 900, pointerId: 1 });
  fireEvent.pointerUp(area, { clientX: 0.4 * 1600, clientY: 0.3 * 900, pointerId: 1 });
  await user.click(screen.getByRole('button', { name: 'Save drawing' }));
  expect(lastPut().shapes).toEqual([{ kind: 'line', x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.3, colour: '#facc15', width: 2 }]);
});
