import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { PlayerProfile } from '../api/types';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlPlayerPage } from './HudlPlayerPage';
import { PlayerHubPage } from './PlayerHubPage';
import { TaggedPlayerPicker } from '../components/player/TaggedPlayerPicker';

afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
const library=[
 {id:'a',title:'261108 U11 v Rovers (A)',age_group:'U11',tag_status:'synced',moments:[{id:'1',category:'Sam Example',time_s:1,duration_s:2},{id:'2',category:'Sam Example',time_s:9,duration_s:2}]},
 {id:'b',title:'261101 U11 v City (H)',age_group:'U11',tag_status:'synced',moments:[{id:'3',category:'Sam Example',time_s:1,duration_s:2}]},
 {id:'c',title:'261025 U11 v Town (H)',age_group:'U11',tag_status:'synced',moments:[{id:'4',category:'Goal',time_s:1,duration_s:2}]},
 {id:'d',title:'261018 U11 v United (H)',age_group:'U11'},
 {id:'e',title:'Highlights clip',age_group:'U11',tag_status:'unavailable',tag_error:'did not load'},
];
const hudl={'http://127.0.0.1:8766/library':library,'http://127.0.0.1:8766/account':{configured:true,state:'ready',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true}};
const posted=(path:string)=>vi.mocked(fetch).mock.calls.filter(c=>String(c[0]).endsWith(path)).map(c=>JSON.parse(String(c[1]?.body)));

function hudlPlayer(){
 renderWithProviders(<Routes><Route path='/player/hudl/:name' element={<HudlPlayerPage/>}/><Route path='/player/:id' element={<p>Hub opened</p>}/></Routes>,'/player/hudl/Sam%20Example');
}

it('lists every cached match where the player is tagged and how many are still unindexed',async()=>{
 stubFetch(hudl);hudlPlayer();
 expect(await screen.findByRole('heading',{name:'261108 U11 v Rovers (A)'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'261101 U11 v City (H)'})).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'261025 U11 v Town (H)'})).toBeNull();
 expect(screen.getByText(/Tags indexed for 4 of 5 matches/)).toBeInTheDocument();
 expect(screen.getByText(/1 video has no readable tags/)).toBeInTheDocument();
 await userEvent.setup().click(screen.getByRole('button',{name:'Index remaining matches'}));
 expect(posted('/account/action')).toContainEqual({action:'sync_tags'});
});

it('opens a real, editable player hub for a Hudl-tagged player',async()=>{
 stubFetch({...hudl,'/api/players/from-hudl-tag':{player_id:9}});hudlPlayer();
 await userEvent.setup().click(await screen.findByRole('button',{name:/Player hub/}));
 expect(posted('/api/players/from-hudl-tag')).toEqual([{category:'Sam Example'}]);
 expect(await screen.findByText('Hub opened')).toBeInTheDocument();
});

it('chooses a Hudl-only tagged name as a real player with a hub',async()=>{
 stubFetch({...hudl,'/api/players/tagged-codes':[],'/api/players/from-hudl-tag':{player_id:9}});
 renderWithProviders(<Routes><Route path='/' element={<TaggedPlayerPicker/>}/><Route path='/player/:id' element={<p>Hub opened</p>}/></Routes>,'/');
 const user=userEvent.setup();
 await screen.findByRole('option',{name:'Sam Example'});
 await user.selectOptions(screen.getByLabelText('Player from video tags'),'Sam Example');
 await user.click(screen.getByRole('button',{name:'Choose tagged player'}));
 expect(posted('/api/players/from-hudl-tag')).toEqual([{category:'Sam Example'}]);
 expect(await screen.findByText('Hub opened')).toBeInTheDocument();
});

it('shows the Hudl matches a hub player is tagged in',async()=>{
 const profile:PlayerProfile={id:9,display_name:'Sam Example',shirt_number:null,position:null,photo_url:null,is_primary:true,totals:{matches:0,moments:0,unwatched:0,favourites:0},categories:[],teams:[],per_match:[],teammates:[],first_match_date:null,latest_match_date:null};
 stubFetch({...hudl,'/api/players/9':profile,'/api/players/9/moments':{total:0,items:[]},'/api/players/9/memories':{seasons:[]}});
 renderWithProviders(<Routes><Route path='/player/:id' element={<PlayerHubPage/>}/></Routes>,'/player/9');
 const region=await screen.findByRole('region',{name:'Tagged in Hudl matches'});
 expect(await within(region).findByRole('link',{name:/261108 U11 v Rovers \(A\).*2 moments/})).toHaveAttribute('href','/hudl/a?player=Sam%20Example');
 expect(within(region).getAllByRole('link')).toHaveLength(2);
});
