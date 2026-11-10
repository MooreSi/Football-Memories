import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../../test/render';
import { HudlLibrary } from './HudlLibrary';
afterEach(()=>vi.unstubAllGlobals());
it('filters cached Hudl thumbnails by age group and opens the streaming match', async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[
 {id:'sample-a',title:'U10 vs Rovers',age_group:'U10',thumbnail_url:'/thumb-a'},
 {id:'sample-b',title:'U12 vs City',age_group:'U12',thumbnail_url:'/thumb-b'}]});
 renderWithProviders(<HudlLibrary/>);
 await screen.findByRole('link',{name:/U10 vs Rovers/});
 await userEvent.setup().selectOptions(screen.getByLabelText('Hudl age group'),'U12');
 expect(screen.queryByRole('link',{name:/U10 vs Rovers/})).toBeNull();
 expect(screen.getByRole('img',{name:'U12 vs City'})).toHaveAttribute('src','/thumb-b');
 expect(screen.getByRole('link',{name:/U12 vs City/})).toHaveAttribute('href','/hudl/sample-b');
});
it('marks matches whose full match and/or moments are already downloaded', async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[
 {id:'a',title:'U10 vs Rovers',age_group:'U10'},{id:'b',title:'U10 vs City',age_group:'U10'},{id:'c',title:'U10 vs Town',age_group:'U10'}],
 'http://127.0.0.1:8766/downloads/index':[
 {kind:'match',match_id:'a',matches:['a'],file:'x.mp4'},{kind:'moments',match_id:'a',matches:['a'],file:'moments/y.zip'},
 {kind:'moments',match_id:'b',matches:['b'],file:'moments/z.zip'}]});
 renderWithProviders(<HudlLibrary/>);
 const a=await screen.findByRole('link',{name:/U10 vs Rovers/});
 expect(await within(a).findByRole('img',{name:'Full match downloaded'})).toBeInTheDocument();
 expect(within(a).getByRole('img',{name:'Moments downloaded'})).toBeInTheDocument();
 const b=screen.getByRole('link',{name:/U10 vs City/});
 expect(within(b).queryByRole('img',{name:'Full match downloaded'})).toBeNull();
 expect(within(b).getByRole('img',{name:'Moments downloaded'})).toBeInTheDocument();
 const c=screen.getByRole('link',{name:/U10 vs Town/});
 expect(within(c).getByRole('img',{name:'Not downloaded yet'})).toBeInTheDocument();
});
