import { afterEach, expect, it } from 'vitest';
import { scopedHudlAction } from './archiveFilters';
afterEach(()=>localStorage.clear());
it('scopes metadata discovery to the saved age without altering specific-match playback',()=>{
 localStorage.setItem('fm.hudl.age','U11');
 expect(scopedHudlAction({action:'refresh'})).toEqual({action:'refresh',age_group:'U11'});
 expect(scopedHudlAction({action:'sync_tags'})).toEqual({action:'sync_tags',age_group:'U11'});
 expect(scopedHudlAction({action:'stream',match_id:'s'})).toEqual({action:'stream',match_id:'s'});
});
