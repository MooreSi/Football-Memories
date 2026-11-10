import { screen } from '@testing-library/react';
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
