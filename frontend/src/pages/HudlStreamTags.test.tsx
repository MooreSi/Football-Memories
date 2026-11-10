import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';

afterEach(()=>vi.unstubAllGlobals());
it('shows cached tags and player filters without requiring a full-match download',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-stream',title:'U11 vs Rovers',age_group:'U11',tag_status:'synced',moments:[{id:'m1',category:'Sam Example',time_s:10,duration_s:5}]}], 'http://127.0.0.1:8766/account':{configured:true,state:'idle',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/synthetic-stream');
 expect(await screen.findByText('Tags cached locally · No full-match download required')).toBeInTheDocument();
 expect(screen.getByRole('option',{name:'Sam Example'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Download all moments'})).toBeInTheDocument();
 const bodies=vi.mocked(fetch).mock.calls.filter(c=>String(c[0]).endsWith('/account/action')).map(c=>JSON.parse(String(c[1]?.body)));
 expect(bodies).toEqual([{action:'stream',match_id:'synthetic-stream'}]);
});
