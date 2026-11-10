import { screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { ClipExplorerPage } from './ClipExplorerPage';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
// Owner request 2026-11-10 (spec 190): Make Highlight Reel replaces the duplicate
// saved-clips explorer beneath a Hudl match; imported clips stay one picker option away.
it('shows one workspace for a Hudl match without the duplicate saved-clips explorer',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'sample',title:'261108 U11 v Rovers',age_group:'U11',moments:[]}],'http://127.0.0.1:8766/account':{state:'ready',busy:false},'http://127.0.0.1:8766/account/action':{},'/api/moments':{total:0,items:[]},'/api/moments/facets':{categories:[],players:[],teams:[],seasons:[],matches:[]},'/api/playlists':[]});
 renderWithProviders(<ClipExplorerPage/>,'/clips');
 await screen.findByRole('heading',{name:'261108 U11 v Rovers',level:1});
 expect(screen.queryByText('Saved clips & playlists')).toBeNull();
 expect(screen.getByRole('heading',{name:'Clip Explorer',level:1})).toBeInTheDocument();
 expect(screen.getByRole('option',{name:'No Hudl match (imported clips only)'})).toBeInTheDocument();
});
