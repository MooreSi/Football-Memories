import { screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../../test/render';
import { YourPlayerCard } from './YourPlayerCard';

afterEach(() => vi.unstubAllGlobals());
const profile = { id: 9, display_name: 'SAMANTHA EXAMPLESON', shirt_number: '1', position: 'Goalkeeper', photo_url: null, is_primary: true,
  totals: { matches: 0, moments: 0, unwatched: 0, favourites: 0 }, categories: [], teams: [], per_match: [], teammates: [], first_match_date: null, latest_match_date: null };

it('shows the whole player name, wrapping onto a second line instead of cutting it off', async () => {
  stubFetch({ '/api/preferences': { primary_player_id: 9 }, '/api/players/9': profile, 'http://127.0.0.1:8766/library': [] });
  renderWithProviders(<YourPlayerCard />);
  const name = await screen.findByText('SAMANTHA EXAMPLESON');
  expect(name.className).not.toContain('truncate');
  expect(name.className).toContain('break-words');
});
