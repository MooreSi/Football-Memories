import { screen } from "@testing-library/react";
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
