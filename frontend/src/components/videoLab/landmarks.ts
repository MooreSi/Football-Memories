export type Point = [number, number];
export type Landmark = { image: Point; pitch: Point; name?: string };
export const PITCH_CORNERS: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
/** Where the marking editor puts the corners when nothing places the pitch yet. */
export const DEFAULT_CORNERS: Point[] = [[0.05, 0.95], [0.95, 0.95], [0.8, 0.35], [0.2, 0.35]];
export const CORNER_NAMES = ["Near-left corner", "Near-right corner", "Far-right corner", "Far-left corner"];
export const EXTRA_POINTS: { name: string; pitch: Point }[] = [
  {name: "Near halfway intersection", pitch: [0.5, 0]},
  {name: "Far halfway intersection", pitch: [0.5, 1]},
  {name: "Centre spot", pitch: [0.5, 0.5]},
  {name: "Left goal-line midpoint", pitch: [0, 0.5]},
  {name: "Right goal-line midpoint", pitch: [1, 0.5]},
];

/** Least-squares image → normalised pitch homography, using every correspondence (optionally weighted).
 * Singular/collinear sets fail closed. Coordinates are normalised to limit conditioning. */
export function fitLandmarks(points: (Landmark & {weight?: number})[]): number[] | null {
  if (points.length < 4 || points.some(p => [...p.image, ...p.pitch].some(v => !Number.isFinite(v)))) return null;
  const rows: number[][] = [], values: number[] = [], weights: number[] = [];
  for (const {image:[x,y],pitch:[u,v],weight=1} of points) {
    rows.push([x,y,1,0,0,0,-u*x,-u*y], [0,0,0,x,y,1,-v*x,-v*y]); values.push(u,v); weights.push(weight,weight);
  }
  const m = Array.from({length:8}, (_,i) => [...Array.from({length:8}, (_,j) => rows.reduce((s,r,k) => s+weights[k]*r[i]*r[j],0)), rows.reduce((s,r,k) => s+weights[k]*r[i]*values[k],0)]);
  for (let i=0;i<8;i++) {
    let pivot=i;
    for(let j=i+1;j<8;j++) if(Math.abs(m[j][i])>Math.abs(m[pivot][i])) pivot=j;
    if(Math.abs(m[pivot][i])<1e-10) return null;
    [m[i],m[pivot]]=[m[pivot],m[i]];
    const d=m[i][i]; for(let k=i;k<=8;k++) m[i][k]/=d;
    for(let j=0;j<8;j++) if(j!==i) { const f=m[j][i]; for(let k=i;k<=8;k++) m[j][k]-=f*m[i][k]; }
  }
  const h=[...m.map(r=>r[8]),1];
  return h.every(Number.isFinite) ? h : null;
}

export function project(h: number[], [x,y]: Point): Point {
  const w=h[6]*x+h[7]*y+h[8];
  return [(h[0]*x+h[1]*y+h[2])/w,(h[3]*x+h[4]*y+h[5])/w];
}
export function inverse(h: number[]): number[] {
  const [a,b,c,d,e,f,g,j,i]=h;
  const cof=[e*i-f*j,c*j-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*j-e*g,b*g-a*j,a*e-b*d];
  const det=a*cof[0]+b*cof[3]+c*cof[6];
  return cof.map(v=>v/det);
}
export function fittedCorners(corners: Point[], landmarks?: Landmark[], indices?: number[]): Point[] | null {
  if (!landmarks?.length && !indices) return corners;
  const h=fitLandmarks([...corners.flatMap((image,i)=>!indices || indices.includes(i)?[{image,pitch:PITCH_CORNERS[i]}]:[]),...(landmarks ?? [])]);
  if(!h) return null;
  const out=PITCH_CORNERS.map(p=>project(inverse(h),p));
  return out.every(p=>p.every(Number.isFinite)) ? out : null;
}

/** Do these pitch points fix a perspective fit: are four of them spread so that no three lie on one
 * pitch line? Three on a line (two corners and a box's goal-line end) leave the fit free to swing. */
export function fixesPitch(points: Point[], minArea = 0.005): boolean {
  const area = (a: Point, b: Point, c: Point) => Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])) / 2;
  const n = points.length;
  for (let a=0;a<n;a++) for (let b=a+1;b<n;b++) for (let c=b+1;c<n;c++) for (let d=c+1;d<n;d++) {
    const q=[points[a],points[b],points[c],points[d]];
    if ([[0,1,2],[0,1,3],[0,2,3],[1,2,3]].every(([i,j,k]) => area(q[i],q[j],q[k]) >= minArea)) return true;
  }
  return false;
}
