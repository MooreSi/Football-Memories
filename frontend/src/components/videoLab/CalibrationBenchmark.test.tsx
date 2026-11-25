import {render,screen,within} from "@testing-library/react";
import {expect,it} from "vitest";
import {CalibrationBenchmarkPanel,isCalibrationBenchmark,type CalibrationBenchmark} from "./CalibrationBenchmark";
const data:CalibrationBenchmark={schema_version:1,source_sha256:"a".repeat(64),annotation_origin:"assistant_visual",score_image_size:[1920,1080],methods:[{id:"current",label:"Current goal-guided estimate",checked_frames:2,total_check_frames:2,line_median_px:18,line_p95_px:35},{id:"pnl_temporal",label:"PnLCalib + camera-step transfer",checked_frames:0,total_check_frames:2,line_median_px:null,line_p95_px:null}],promotion:{status:"not_promoted",candidate:null,reasons:["independent_review_required","heldout_accuracy_or_coverage_gate_failed"]},comparison_image:"pitch_calibration_comparison.jpg",requires_review:true};
it("shows independent check provenance and missing coverage without treating an experiment as accepted",()=>{
 render(<CalibrationBenchmarkPanel jobId={"b".repeat(32)} sourceHash={data.source_sha256} data={data}/>);
 const table=screen.getByRole("table",{name:"Pitch calibration comparison"});
 expect(within(table).getByText("18.0 px")).toBeInTheDocument();
 expect(within(table).getByText("0/2")).toBeInTheDocument();
 expect(screen.getByText(/Assistant-marked checks/)).toBeInTheDocument();
 expect(screen.getByText(/Current calibration remains in use/)).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:/Accept|Apply/})).not.toBeInTheDocument();
 expect(screen.getByRole("img",{name:"Pitch calibration comparison frames"})).toHaveAttribute("src",expect.stringContaining("pitch_calibration_comparison.jpg"));
});
it("does not present another source's benchmark or a malformed score",()=>{
 const {container}=render(<CalibrationBenchmarkPanel jobId={"b".repeat(32)} sourceHash={"c".repeat(64)} data={data}/>);
 expect(container).toBeEmptyDOMElement();
 expect(isCalibrationBenchmark({...data,methods:[{...data.methods[0],line_median_px:NaN}]})).toBe(false);
});
it("rejects null method entries without breaking the workspace",()=>{
 expect(isCalibrationBenchmark({...data,methods:[null]})).toBe(false);
});
