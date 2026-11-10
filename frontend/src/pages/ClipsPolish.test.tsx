import { screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { ClipExplorerPage } from './ClipExplorerPage';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
it('keeps secondary saved-clip tools together rather than stacking a second workspace',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'sample',title:'261108 U11 v Rovers',age_group:'U11',moments:[]}],'http://127.0.0.1:8766/account':{state:'ready',busy:false},'http://127.0.0.1:8766/account/action':{},'/api/moments':{total:0,items:[]},'/api/moments/facets':{categories:[],players:[],teams:[],seasons:[],matches:[]},'/api/playlists':[]});
 renderWithProviders(<ClipExplorerPage/>,'/clips');
 await screen.findByRole('heading',{name:'261108 U11 v Rovers',level:1});
 const section=screen.getByText('Saved clips & playlists').closest('details');
 expect(section).not.toHaveAttribute('open');
 expect(screen.getByRole('heading',{name:'Clip Explorer',level:1})).toBeInTheDocument();
});
