import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../test/render';
import { ClipExplorerPage } from './ClipExplorerPage';

afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
const library=[
 {id:'old',title:'261101 U11s v West Brom (A)',age_group:'U11',age_groups:['U11'],moments:[{id:'w1',category:'Goal',time_s:5,duration_s:2}]},
 {id:'u10',title:'261109 U10 v Derby (H)',age_group:'U10',age_groups:['U10'],moments:[]},
 {id:'new',title:'261108 U11 v Stoke (A)',age_group:'U11',age_groups:['U11'],moments:[{id:'s1',category:'Lawson Moore',time_s:10,duration_s:5}]},
];
function render(){
 stubFetch({'http://127.0.0.1:8766/library':library,'http://127.0.0.1:8766/account':{configured:true,state:'ready',busy:false},'http://127.0.0.1:8766/account/action':{accepted:true},
  '/api/moments':{total:0,items:[]},'/api/moments/facets':{categories:[],players:[],teams:[],seasons:[],matches:[]},'/api/playlists':[]});
 renderWithProviders(<ClipExplorerPage/>,'/clips');
}

it('defaults to the most recent Hudl match for the selected age group',async()=>{
 localStorage.setItem('fm.hudl.age','U11');render();
 const picker=await screen.findByRole('combobox',{name:'Match'});
 await vi.waitFor(()=>expect(picker).toHaveValue('new'));
 expect(await screen.findByRole('heading',{name:'261108 U11 v Stoke (A)',level:1})).toBeInTheDocument();
 expect(screen.getByRole('option',{name:'Lawson Moore'})).toBeInTheDocument();
});

it('switches to another match or to imported clips',async()=>{
 render();const user=userEvent.setup();
 const picker=await screen.findByRole('combobox',{name:'Match'});
 await vi.waitFor(()=>expect(picker).toHaveValue('u10'));
 await user.selectOptions(picker,'old');
 expect(await screen.findByRole('heading',{name:'261101 U11s v West Brom (A)',level:1})).toBeInTheDocument();
 await user.selectOptions(picker,'imported');
 expect(await screen.findByRole('heading',{name:/Clip Explorer|Clips|moments/i,level:1})).toBeInTheDocument();
});
