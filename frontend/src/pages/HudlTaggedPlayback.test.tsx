import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';

afterEach(()=>vi.unstubAllGlobals());
const library=[{id:'synthetic-a',title:'U11 v Rovers (A)',age_group:'U11',tag_status:'synced',moments:[{id:'m2',category:'Sam Example',time_s:40,duration_s:5},{id:'m1',category:'Sam Example',time_s:10,duration_s:5},{id:'m3',category:'Goal',time_s:20,duration_s:5}]}];
function open(status:object={configured:true,state:'ready',busy:false,match_id:'synthetic-a',stream_url:'http://127.0.0.1:8766/stream/x/playlist.m3u8'}){
 stubFetch({'http://127.0.0.1:8766/library':library,'http://127.0.0.1:8766/account':status,'http://127.0.0.1:8766/account/action':{accepted:true}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/synthetic-a');
}
const actions=()=>vi.mocked(fetch).mock.calls.filter(c=>String(c[0]).endsWith('/account/action')).map(c=>JSON.parse(String(c[1]?.body)));

it('plays the chosen player tagged moments one after another from the first',async()=>{
 open();const user=userEvent.setup();
 await screen.findByRole('option',{name:'Sam Example'});
 await user.selectOptions(screen.getByLabelText('Tagged code / player'),'Sam Example');
 await user.click(screen.getByRole('button',{name:'Play Tagged (2)'}));
 expect(screen.getByRole('status',{name:'Tagged playback'})).toHaveTextContent('Playing tagged moment 1 of 2');
 expect(screen.getByRole('status',{name:'Tagged playback'})).toHaveTextContent('0:10');
 await user.click(screen.getByRole('button',{name:'Stop tagged playback'}));
 expect(screen.queryByRole('status',{name:'Tagged playback'})).toBeNull();
});

it('asks whether to download separate files or one combined video',async()=>{
 open();const user=userEvent.setup();
 await screen.findByRole('option',{name:'Sam Example'});
 await user.selectOptions(screen.getByLabelText('Tagged code / player'),'Sam Example');
 await user.click(screen.getByRole('button',{name:'Download player / code moments'}));
 const dialog=screen.getByRole('dialog',{name:'Download 2 moments'});
 expect(actions().filter(a=>a.action==='clips')).toEqual([]);
 await user.click(within(dialog).getByRole('button',{name:/One combined video/}));
 expect(actions()).toContainEqual({action:'clips',match_id:'synthetic-a',moment_ids:['m2','m1'],combined:true});
 expect(screen.queryByRole('dialog')).toBeNull();
});

it('downloads separate files when chosen, and cancel sends nothing',async()=>{
 open();const user=userEvent.setup();
 await screen.findByRole('option',{name:'Sam Example'});
 await user.click(screen.getByRole('button',{name:'Download all moments'}));
 await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Cancel'}));
 expect(actions().filter(a=>a.action==='clips')).toEqual([]);
 await user.click(screen.getByRole('button',{name:'Download all moments'}));
 await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:/Separate files/}));
 expect(actions()).toContainEqual({action:'clips',match_id:'synthetic-a',moment_ids:['m2','m1','m3'],combined:false});
});

it('does not let background tag indexing block streaming this match',async()=>{
 open({configured:true,state:'syncing',busy:true,syncing:true,message:'Indexing tags'});
 await screen.findByRole('option',{name:'Sam Example'});
 await vi.waitFor(()=>expect(actions()).toContainEqual({action:'stream',match_id:'synthetic-a'}));
});
