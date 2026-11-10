import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../../test/render';
import { TaggedPlayerPicker } from './TaggedPlayerPicker';
afterEach(()=>vi.unstubAllGlobals());
it('explicitly selects an existing video code without guessing other player tags',async()=>{
 stubFetch({'/api/players/tagged-codes':[{name:'Sam Example',moments:3,matches:1},{name:'Goal',moments:2,matches:1}],'/api/players/from-tag':{player_id:7},'http://127.0.0.1:8766/library':[]});
 renderWithProviders(<TaggedPlayerPicker/>);
 await screen.findByRole('option',{name:'Sam Example'});
 await userEvent.setup().selectOptions(screen.getByLabelText('Player from video tags'),'Sam Example');
 await userEvent.setup().click(screen.getByRole('button',{name:'Choose tagged player'}));
 const call=vi.mocked(fetch).mock.calls.find(c=>c[0]==='/api/players/from-tag');
 expect(JSON.parse(String(call?.[1]?.body))).toEqual({category:'Sam Example'});
});
