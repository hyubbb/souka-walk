import { useEffect, useRef } from 'react';
import { useGame } from './useGame';

/** The photo you just took and the reel you just recorded. */
export function Modals() {
  const G = useGame();
  const closeRef = useRef<HTMLButtonElement>(null);
  const shot = G?.ui.shotUrl, video = G?.ui.video;
  useEffect(() => { if (shot || video) closeRef.current?.focus(); }, [shot, video]);
  if (!G) return null;
  const close = (patch: object) => { G.setUi(patch); G.stage.focus(); };
  if (video) {
    return (
      <div className="modal" role="dialog" aria-label="녹화한 릴스">
        <div className="modal-in">
          <video src={video.url} controls playsInline />
          <p>{video.note}</p>
          <div className="row">
            <button className="primary" onClick={() => G.saveVideo()}>영상 저장</button>
            <button ref={closeRef} onClick={() => close({ video: null })}>닫기</button>
          </div>
        </div>
      </div>
    );
  }
  if (shot) {
    return (
      <div className="modal" role="dialog" aria-label="찍은 사진">
        <div className="modal-in">
          <img src={shot} alt="찍은 사진 1080×1350" />
          <p>1080×1350 · 저장 버튼을 누르거나 이미지를 우클릭(폰은 길게 누르기)해서 저장하세요.</p>
          <div className="row">
            <button className="primary" onClick={() => G.saveShot()}>사진 저장</button>
            <button ref={closeRef} onClick={() => close({ shotUrl: null })}>닫기</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
