import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StreamPlayer } from './HudlAccount';

afterEach(()=>vi.restoreAllMocks());
it('loads an unstarted native stream before seeking from a tag',()=>{
 vi.spyOn(HTMLMediaElement.prototype,'canPlayType').mockReturnValue('probably');
 const load=vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 const {rerender}=render(<StreamPlayer url='http://localhost/synthetic.m3u8'/>);
 expect(load).not.toHaveBeenCalled();
 rerender(<StreamPlayer url='http://localhost/synthetic.m3u8' seek={{time:42,nonce:1}}/>);
 expect(load).toHaveBeenCalledTimes(1);
 const video=screen.getByLabelText('Hudl match stream') as HTMLVideoElement;
 fireEvent.loadedMetadata(video);
 expect(video.currentTime).toBe(42);
 expect(play).toHaveBeenCalled();
});
