import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";
afterEach(()=>vi.unstubAllGlobals());
it("selects completed runs by real match name in a dropdown",async()=>{
 const first="a".repeat(32),second="b".repeat(32);
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.endsWith('/samples'))return Response.json([{id:'match-a',label:'Riverside vs Northgate',duration_s:600},{id:'match-b',label:'City vs Town',duration_s:300}]);
  if(url.endsWith('/jobs'))return Response.json([{id:first,sample_id:'match-a',state:'queued'},{id:second,sample_id:'match-b',state:'queued'}]);
  return Response.json({id:url.includes(second)?second:first,state:'queued'});
 }));
 renderWithProviders(<VideoLabPage/>);
 const picker=await screen.findByRole('combobox',{name:'Analysis run'});
 expect(screen.getByRole('option',{name:/Riverside vs Northgate.*10 min/})).toBeInTheDocument();
 await userEvent.selectOptions(picker,second);
 expect(picker).toHaveValue(second);
});
it("deleting the selected run drops it from the picker and opens the next run",async()=>{
 const first="a".repeat(32),second="b".repeat(32);let gone=false;
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/me'))return Response.json({csrf_token:'synthetic'});
  if(init?.method==='DELETE'){gone=true;return Response.json({deleted:[first],kept_labels:[],freed_bytes:5e8});}
  if(url.endsWith('/samples'))return Response.json([{id:'match-a',label:'Riverside vs Northgate',duration_s:600},{id:'match-b',label:'City vs Town',duration_s:300}]);
  if(url.endsWith('/jobs'))return Response.json([...(gone?[]:[{id:first,sample_id:'match-a',state:'failed'}]),{id:second,sample_id:'match-b',state:'failed'}]);
  return Response.json({id:url.includes(second)?second:first,state:'failed'});
 }));
 renderWithProviders(<VideoLabPage/>);
 const picker=await screen.findByRole('combobox',{name:'Analysis run'});
 await within(picker).findByRole('option',{name:/Riverside vs Northgate/});
 await userEvent.click(screen.getByRole('button',{name:'Delete this run'}));
 expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete Riverside vs Northgate?');
 await userEvent.click(screen.getByRole('button',{name:'Delete permanently'}));
 expect(await screen.findByText('Deleted 1 run and freed 500 MB.')).toBeInTheDocument();
 expect(within(picker).queryByRole('option',{name:/Riverside vs Northgate/})).not.toBeInTheDocument();
 expect(picker).toHaveValue(second);
});
