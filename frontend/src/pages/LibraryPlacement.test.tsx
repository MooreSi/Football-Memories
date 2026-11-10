import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { LibraryPage } from './LibraryPage';
import { HudlLibrary } from '../components/hudl/HudlLibrary';
import { renderWithProviders, stubFetch } from '../test/render';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
const matches=[{id:'sample-a',title:'261108 U10 vs Rovers',age_group:'U10',season_label:'2026/27',thumbnail_url:'/a.jpg'}, {id:'sample-b',title:'250501 U12 vs City',age_group:'U12',season_label:'2024/25',thumbnail_url:'/b.jpg'}];
it('places connected footage inside All matches and filters by shared age and season controls',async()=>{
 stubFetch({'/api/matches':{total:0,page:1,page_size:24,items:[]},'/api/stats':{matches:0,moments:0,footage_seconds:0,teams:0,players:0,top_tags:[],recent_moments:[]},'/api/teams':[],'/api/seasons':[],'/api/preferences':{primary_player_id:null},'http://127.0.0.1:8766/library':matches});
 renderWithProviders(<LibraryPage/>);
 const collection=await screen.findByRole('region',{name:'All matches'});
 await within(collection).findByRole('link',{name:/261108 U10 vs Rovers/});
 await userEvent.setup().selectOptions(within(collection).getByLabelText('Season'),'2024/25');
 expect(within(collection).queryByRole('link',{name:/261108 U10 vs Rovers/})).toBeNull();
 expect(within(collection).getByRole('link',{name:/250501 U12 vs City/})).toBeInTheDocument();
 await userEvent.setup().selectOptions(within(collection).getByLabelText('Age group'),'U10');
 expect(within(collection).queryByRole('link',{name:/250501 U12 vs City/})).toBeNull();
});
it('shows a helper error and retry instead of silently hiding connected matches',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
 renderWithProviders(<HudlLibrary/>);
 expect(await screen.findByRole('alert')).toHaveTextContent(/Hudl/i);
 expect(screen.getByRole('button',{name:'Retry connection'})).toBeInTheDocument();
});
it('does not let a stale saved age selection hide the entire catalogue',async()=>{
 localStorage.setItem('fm.hudl.age','U99');
 stubFetch({'http://127.0.0.1:8766/library':matches});
 renderWithProviders(<HudlLibrary/>);
 expect(await screen.findByRole('link',{name:/261108 U10 vs Rovers/})).toBeInTheDocument();
});
