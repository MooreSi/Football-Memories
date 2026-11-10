import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { HudlMatchPage } from './HudlMatchPage';
afterEach(()=>vi.unstubAllGlobals());
it('identifies friendly named combined clips without offering full-match import',async()=>{
 stubFetch({'http://127.0.0.1:8766/library':[{id:'s',title:'U11 v Rovers',age_group:'U11'}],'http://127.0.0.1:8766/account':{state:'done',busy:false,match_id:'s',stream_url:'http://localhost/s.m3u8',download_url:'http://localhost/f.mp4',filename:'U11 v Rovers - Sam - 2026-11-08.mp4',download_kind:'moments'}});
 renderWithProviders(<Routes><Route path='/hudl/:id' element={<HudlMatchPage/>}/></Routes>,'/hudl/s');
 expect(await screen.findByRole('link',{name:'Download combined moments video'})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:/Import offline match/})).toBeNull();
});
