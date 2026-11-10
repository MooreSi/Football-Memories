import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
afterEach(()=>vi.unstubAllGlobals());
it('explains unsynced tags while allowing full-match download and disabling moment export',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'synthetic-a',title:'U11 vs Rovers',age_group:'U11',moments:[],tag_status:'unsynced'}], 'http://127.0.0.1:8766/account':{configured:true,state:'ready',busy:false,match_id:'synthetic-a'},'http://127.0.0.1:8766/account/action':{accepted:true}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/synthetic-a');
 expect(await screen.findByRole('note')).toHaveTextContent(/not marked.*synced/i);
 const download=screen.getByRole('button',{name:'Download full match'});
 await waitFor(()=>expect(download).toBeEnabled());
 expect(screen.getByRole('button',{name:'Download all moments'})).toBeDisabled();
 await userEvent.setup().click(download);
 expect(vi.mocked(fetch).mock.calls.some(c=>String(c[1]?.body)===JSON.stringify({action:'download',match_id:'synthetic-a'}))).toBe(true);
});
