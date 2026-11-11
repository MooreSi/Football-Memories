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
  // A fixed strip: long names truncate instead of growing the chart.
  for (const label of labels) expect(label?.className).toContain('h-24');
});

it('keeps the date horizontal under the vertical opposition name, which is large enough to read', () => {
  render(<MemoryRouter><MomentsPerMatch series={series} /></MemoryRouter>);
  const bar = within(screen.getByRole('list', { name: 'Moments per match, oldest to newest' })).getAllByRole('listitem')[1];
  const date = within(bar).getByText('8 Nov');
  expect(date.className).not.toContain('writing-mode');
  // Directly under the bar: the bar's column, then the date, then the name.
  expect(date.previousElementSibling?.querySelector('a')).toHaveAccessibleName('5 moments vs West Bromwich Albion');
  expect(date.nextElementSibling).toHaveAttribute('data-bar-label');
  expect(bar.querySelector('[data-bar-label]')?.className).toContain('text-xs');
});
