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

// Owner request 2026-11-14: the club crest sits to the right of the player's name.
it('shows the club crest to the right of the name', async () => {
  stubFetch({ '/api/preferences': { primary_player_id: 9 }, '/api/players/9': { ...profile, club_name: 'Riverside FC' }, 'http://127.0.0.1:8766/library': [] });
  renderWithProviders(<YourPlayerCard />);
  const crest = await screen.findByRole('img', { name: 'Riverside FC crest' });
  expect(crest).toHaveAttribute('src', '/api/team-logo?name=Riverside%20FC');
  const name = screen.getByText('SAMANTHA EXAMPLESON');
  expect(name.compareDocumentPosition(crest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('shows no crest when no club is set', async () => {
  stubFetch({ '/api/preferences': { primary_player_id: 9 }, '/api/players/9': { ...profile, club_name: null }, 'http://127.0.0.1:8766/library': [] });
  renderWithProviders(<YourPlayerCard />);
  await screen.findByText('SAMANTHA EXAMPLESON');
  expect(screen.queryByRole('img', { name: /crest/ })).toBeNull();
});
