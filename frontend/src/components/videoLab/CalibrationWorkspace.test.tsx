import {screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders} from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";
afterEach(()=>vi.unstubAllGlobals());
it("loads a manifest-declared calibration comparison beside the existing review",async()=>{
 const id="b".repeat(32),hash="c".repeat(64);
 const report={schema_version:1,source_sha256:hash,annotation_origin:"assistant_visual",score_image_size:[1920,1080],methods:[{id:"current",label:"Current goal-guided estimate",checked_frames:2,total_check_frames:2,line_median_px:18,line_p95_px:35}],promotion:{status:"not_promoted",candidate:null,reasons:["independent_review_required"]},comparison_image:"pitch_calibration_comparison.jpg",requires_review:true};
 const fetcher=vi.fn(async(url:string)=>{
  if(url.endsWith("/samples"))return Response.json([]);
  if(url.endsWith("/review"))return Response.json({revision:0,source_sha256:hash});
  if(url.endsWith("pitch_calibration_benchmark.json"))return Response.json(report);
  const job={id,state:"complete",progress:1,summary:{source_sha256:hash},artifacts:["pitch_calibration_benchmark.json","pitch_calibration_comparison.jpg"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 });
 vi.stubGlobal("fetch",fetcher);renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByRole("table",{name:"Pitch calibration comparison"})).toBeInTheDocument();
 expect(screen.getByText(/Current calibration remains in use/)).toBeInTheDocument();
 expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(`${id}/files/pitch_calibration_benchmark.json`),expect.objectContaining({credentials:"same-origin"}));
});
