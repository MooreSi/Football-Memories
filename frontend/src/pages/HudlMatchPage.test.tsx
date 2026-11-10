import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
afterEach(()=>vi.unstubAllGlobals());
it('opens the connected stream automatically and downloads only the chosen player code ranges',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-a',title:'U10 vs Rovers',age_group:'U10',moments:[{id:'m1',category:'Sam Example',time_s:10,duration_s:5},{id:'m2',category:'Goal',time_s:20,duration_s:5}]}], 'http://127.0.0.1:8766/account':{configured:true,state:'idle',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/synthetic-a');
 await screen.findByRole('option',{name:'Sam Example'});
 await userEvent.setup().selectOptions(screen.getByLabelText('Tagged code / player'),'Sam Example');
 await userEvent.setup().click(screen.getByRole('button',{name:'Download player / code moments'}));
 const bodies=vi.mocked(fetch).mock.calls.filter(c=>String(c[0]).endsWith('/account/action')).map(c=>JSON.parse(String(c[1]?.body)));
 expect(bodies).toContainEqual({action:'stream',match_id:'synthetic-a'});
 expect(bodies).toContainEqual({action:'clips',match_id:'synthetic-a',moment_ids:['m1']});
});
