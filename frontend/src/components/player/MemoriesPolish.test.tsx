import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders, stubFetch } from '../../test/render';
import { MemoriesTimeline } from './MemoriesTimeline';
afterEach(()=>vi.unstubAllGlobals());
it('keeps long tag lists compact with an explicit way to reveal every moment',async()=>{
 stubFetch({'/api/players/1/moments':{total:0,items:[]}});
 renderWithProviders(<MemoriesTimeline playerId={1} categories={[]} hudl={[{id:'synthetic',title:'261108 U11 v Rovers',opponent:'Rovers',date:'2026-11-08',season:'2026/27',age:'U11',moments:Array.from({length:30},(_,i)=>({id:String(i),category:'Sam Example',time_s:i*10,duration_s:5}))}]}/>);
 const timeline=screen.getByRole('region',{name:'Memories timeline'});
 const expand=await within(timeline).findByRole('button',{name:'Show all 30 moments'});
 expect(within(timeline).getAllByRole('link',{name:/Sam Example/})).toHaveLength(6);
 await userEvent.click(expand);
 expect(within(timeline).getAllByRole('link',{name:/Sam Example/})).toHaveLength(30);
 expect(within(timeline).getAllByText('Season 2026/27')).toHaveLength(1);
});

it('reveals a long match history progressively without dropping older matches',async()=>{
 stubFetch({'/api/players/1/moments':{total:0,items:[]}});
 renderWithProviders(<MemoriesTimeline playerId={1} categories={[]} hudl={Array.from({length:25},(_,i)=>({id:String(i),title:'Synthetic match',opponent:`Rovers ${i}`,date:'2026-11-08',season:'2026/27',age:'U11',moments:[{id:String(i),category:'Sam Example',time_s:1,duration_s:2}]}))}/>);
 const region=screen.getByRole('region',{name:'Memories timeline'});
 const more=await within(region).findByRole('button',{name:'Show more matches'});
 expect(within(region).getAllByRole('article')).toHaveLength(12);
 await userEvent.click(more);
 expect(within(region).getAllByRole('article')).toHaveLength(24);
 await userEvent.click(more);
 expect(within(region).getAllByRole('article')).toHaveLength(25);
});

it('shows the opposition crest at the top right of each match card',async()=>{
 stubFetch({'/api/players/1/moments':{total:0,items:[]}});
 renderWithProviders(<MemoriesTimeline playerId={1} categories={[]} hudl={[{id:'m',title:'261108 U11 v Stoke (A)',opponent:'Stoke City',date:'2026-11-08',season:'2026/27',age:'U11',moments:[{id:'1',category:'Sam Example',time_s:1,duration_s:2}]}]}/>);
 const card=await within(screen.getByRole('region',{name:'Memories timeline'})).findByRole('article');
 const header=card.firstElementChild as HTMLElement;
 const crest=header.lastElementChild as HTMLElement;
 expect(crest).toHaveAttribute('data-crest');
 expect(crest.querySelector('img')).toHaveAttribute('src','/api/team-logo?name=Stoke%20City');
});
