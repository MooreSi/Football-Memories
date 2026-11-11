import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { MomentsPerMatch } from './Charts';

const series = [
  { match_id: 1, match_date: '2026-10-18', opponent: 'Liverpool', moments: 3 },
  { match_id: 2, match_date: '2026-11-08', opponent: 'West Bromwich Albion', moments: 5 },
];

it('names the game under each bar, written vertically so the chart keeps its size', () => {
  render(<MemoryRouter><MomentsPerMatch series={series} /></MemoryRouter>);
  const bars = within(screen.getByRole('list', { name: 'Moments per match, oldest to newest' })).getAllByRole('listitem');
  const labels = bars.map((bar) => bar.querySelector('[data-bar-label]'));
  expect(labels.map((l) => l?.textContent)).toEqual(['Liverpool', 'West Bromwich Albion']);
  for (const label of labels) {
    expect(label).toHaveAttribute('title');
    expect(label?.className).toContain('[writing-mode:vertical-rl]');
  }
  expect(screen.getByRole('list', { name: 'Moments per match, oldest to newest' }).className).toContain('h-44');
});
