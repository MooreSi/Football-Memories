import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { PlayerProfile } from '../api/types';
import { YourPlayerCard } from '../components/library/YourPlayerCard';
import { renderWithProviders, stubFetch } from '../test/render';
import { PlayerHubPage } from './PlayerHubPage';

afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
const NAME='SAM EXAMPLE';
const library=[
 {id:'a',title:'261108 U11 v Stoke (A)',age_group:'U11',season_label:'2026/27',tag_status:'synced',moments:[
  {id:'1',category:NAME,time_s:60,duration_s:10},{id:'2',category:NAME,time_s:300,duration_s:10},
  {id:'o1',category:'OPPOSITION CHANCE',time_s:62,duration_s:4},{id:'o2',category:'GK SAVE',time_s:301,duration_s:2},
  {id:'o3',category:'ALEX SAMPLE',time_s:61,duration_s:3},{id:'o4',category:'BALL OUT OF PLAY',time_s:900,duration_s:3}]},
 {id:'b',title:'261018 U11 v Liverpool (H)',age_group:'U11',season_label:'2026/27',tag_status:'synced',moments:[{id:'3',category:NAME,time_s:30,duration_s:5},{id:'o5',category:'PRESSING',time_s:31,duration_s:2}]},
];
const profile:PlayerProfile={id:9,display_name:NAME,shirt_number:'1',position:'Goalkeeper',photo_url:null,is_primary:true,totals:{matches:0,moments:0,unwatched:0,favourites:0},categories:[],teams:[],per_match:[],teammates:[],first_match_date:null,latest_match_date:null};
const routes={'http://127.0.0.1:8766/library':library,'http://127.0.0.1:8766/account':{configured:true,state:'ready',busy:false},'/api/players/9':profile,'/api/players/9/moments':{total:0,items:[]},'/api/preferences':{primary_player_id:9}};

it('counts Hudl-tagged matches and moments on the hub',async()=>{
 localStorage.setItem('fm.hudl.watched',JSON.stringify(['1']));
 stubFetch(routes);
 renderWithProviders(<Routes><Route path='/player/:id' element={<PlayerHubPage/>}/></Routes>,'/player/9');
 await screen.findByRole('region',{name:'Tagged in Hudl matches'});
 const tile=(label:string)=>screen.getByText(label,{selector:'span.text-sm'}).closest('.tile') as HTMLElement;
 expect(within(tile('Matches')).getByText('2')).toBeInTheDocument();
 expect(within(tile('Moments')).getByText('3')).toBeInTheDocument();
 expect(within(tile('Unwatched')).getByText('2')).toBeInTheDocument();
 const chart=screen.getByRole('list',{name:'Moments per match, oldest to newest'});
 expect(within(chart).getByRole('link',{name:'2 moments vs Stoke City'})).toHaveAttribute('href','/hudl/a?player=SAM%20EXAMPLE');
 const timeline=screen.getByRole('region',{name:'Memories timeline'});
 expect(await within(timeline).findByText('Season 2026/27')).toBeInTheDocument();
 expect(within(timeline).getByRole('link',{name:/1:00 SAM EXAMPLE/})).toHaveAttribute('href','/hudl/a?moment=1');
});

it('shows Hudl totals on the Your player card',async()=>{
 stubFetch(routes);
 renderWithProviders(<YourPlayerCard/>);
 expect(await screen.findByText('3 moments in 2 matches')).toBeInTheDocument();
});
