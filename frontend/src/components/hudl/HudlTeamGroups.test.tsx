import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { HudlLibrary } from './HudlLibrary';
import { renderWithProviders, stubFetch } from '../../test/render';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
it('filters shared videos by actual team membership even when the title says another age',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[
  {id:'sample-a',title:'U10 vs Rovers',age_group:'U10',age_groups:['U10','U11'],season_label:'2026/27'},
  {id:'sample-b',title:'Training',age_group:'U12',age_groups:['U12'],season_label:'2026/27'},
 ]});
 renderWithProviders(<HudlLibrary/>);
 await screen.findByRole('link',{name:'U10 vs Rovers'});
 await userEvent.setup().selectOptions(screen.getByLabelText('Hudl age group'),'U11');
 expect(screen.getByRole('link',{name:'U10 vs Rovers'})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Training'})).toBeNull();
 expect(screen.getAllByRole('option').map(o=>o.textContent)).toEqual(expect.arrayContaining(['U10','U11','U12']));
});
