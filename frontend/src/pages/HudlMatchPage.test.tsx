import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
import { App } from '../App';
afterEach(()=>vi.unstubAllGlobals());
it('opens the connected stream automatically and downloads only the chosen player code ranges',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-a',title:'U10 vs Rovers',age_group:'U10',moments:[{id:'m1',category:'Sam Example',time_s:10,duration_s:5},{id:'m2',category:'Goal',time_s:20,duration_s:5}]}], 'http://127.0.0.1:8766/account':{configured:true,state:'idle',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/synthetic-a');
 await screen.findByRole('option',{name:'Sam Example'});
 await userEvent.setup().selectOptions(screen.getByLabelText('Tagged code / player'),'Sam Example');
 await userEvent.setup().click(screen.getByRole('button',{name:'Download player / code moments'}));
 await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button',{name:/Separate files/}));
 const bodies=vi.mocked(fetch).mock.calls.filter(c=>String(c[0]).endsWith('/account/action')).map(c=>JSON.parse(String(c[1]?.body)));
 expect(bodies).toContainEqual({action:'stream',match_id:'synthetic-a'});
 expect(bodies).toContainEqual({action:'clips',match_id:'synthetic-a',moment_ids:['m1'],combined:false});
});

// Owner request 2026-11-15: pick several moment types at once in the rail, to watch
// them together and make one reel of all of them.
it('shows and makes a reel of several chosen moment types at once', async () => {
 sessionStorage.clear();
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-a',title:'U10 vs Rovers',age_group:'U10',moments:[
  {id:'m1',category:'Goal',time_s:10,duration_s:5},{id:'m2',category:'Corner',time_s:20,duration_s:5},{id:'m3',category:'Foul',time_s:30,duration_s:5}]}],
  'http://127.0.0.1:8766/account':{configured:true,state:'idle',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true},
  '/api/settings/home-teams':{hudl:null,veo:null},'/api/notes':[]});
 renderWithProviders(<App/>,'/hudl/synthetic-a');
 const user=userEvent.setup();
 const goal=await screen.findByRole('button',{name:/^Goal\s*1$/});
 await user.click(goal);
 await user.click(screen.getByRole('button',{name:/^Corner\s*1$/}));
 expect(goal).toHaveAttribute('aria-pressed','true');
 expect(screen.getAllByRole('checkbox',{name:/^Select /}).map(c=>c.getAttribute('aria-label'))).toEqual(['Select Goal at 0:10','Select Corner at 0:20']);
 await user.click(screen.getByRole('button',{name:/Make Highlight Reel/}));
 expect(await screen.findByText('HIGHLIGHT REEL STUDIO')).toBeInTheDocument();
 expect(JSON.parse(sessionStorage.getItem('fm.reel.selection')!)).toMatchObject({items:[{match_id:'synthetic-a',moment_ids:['m1','m2']}]});
 sessionStorage.clear();
});

// Owner request 2026-11-15: team stats on a Hudl match, as on a Veo match.
it('shows the team stats from the tags that name a side', async () => {
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-a',title:'261108 Riverside v Rovers',age_group:'U10',moments:[
  {id:'m1',category:'RIVERSIDE CORNER',time_s:10,duration_s:1},{id:'m2',category:'RIVERSIDE CORNER',time_s:20,duration_s:1},
  {id:'m3',category:'OPPOSITION CORNER',time_s:30,duration_s:1},{id:'m4',category:'RIVERSIDE GOAL',time_s:40,duration_s:1},
  {id:'m5',category:'OPPOSITION GOAL',time_s:50,duration_s:1}]}],
  'http://127.0.0.1:8766/account':{configured:true,state:'idle',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true},
  '/api/settings/home-teams':{hudl:'Riverside',veo:null},'/api/notes':[]});
 renderWithProviders(<App/>,'/hudl/synthetic-a');
 const team=await screen.findByRole('region',{name:'Team stats'});
 expect(within(team).getByRole('columnheader',{name:'Riverside'})).toBeInTheDocument();
 expect(within(team).getByRole('row',{name:/Corners/})).toHaveTextContent(/2.*Corners.*1/);
 expect(within(team).getByRole('row',{name:/Goals/})).toHaveTextContent(/1.*Goals.*1/);
});
