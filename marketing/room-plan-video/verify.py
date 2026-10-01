"""Inspect complete MP4 streams and decode timeline samples; never run a browser."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'out'
TIMES=[0,1.5,3.8,6.8,9,11.5,13.5,15,17,18.8,20.5,21.6,23.3,24.8,26.2,27.9]
result={'recorded_date':'2026-10-02','files':[],'timeline_samples_seconds':TIMES,'visual_review':'pending final decoded-frame inspection','published':False}
for lang in ['en','zh-CN']:
    file=OUT/f'room-plan-{lang}-1080x1920.mp4'
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(file)]))
    video=next(x for x in info['streams'] if x['codec_type']=='video')
    audio=next(x for x in info['streams'] if x['codec_type']=='audio')
    assert video['codec_name']=='h264' and video['pix_fmt']=='yuv420p'
    assert (video['width'],video['height'])==(1080,1920)
    assert video['r_frame_rate']=='30/1' and int(video['nb_read_frames'])==840
    assert abs(float(info['format']['duration'])-28)<.05
    assert audio['codec_name']=='aac' and int(audio['channels'])==2
    subprocess.run(['ffmpeg','-hide_banner','-v','error','-i',str(file),'-f','null','-'],check=True)
    target=OUT/'decoded'/lang;target.mkdir(parents=True,exist_ok=True)
    expression='+'.join(f'eq(n\\,{round(t*30)})' for t in TIMES)
    subprocess.run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(file),'-vf',f'select={expression}','-fps_mode','vfr',str(target/'frame-%02d.png')],check=True)
    frames=list(target.glob('frame-*.png'));assert len(frames)==len(TIMES)
    payload=file.read_bytes();moov=payload.find(b'moov');mdat=payload.find(b'mdat');assert 0<moov<mdat
    loudness=subprocess.run(['ffmpeg','-hide_banner','-i',str(file),'-af','volumedetect','-vn','-f','null','-'],capture_output=True,text=True,check=True).stderr
    volume=[line.strip() for line in loudness.splitlines() if 'mean_volume' in line or 'max_volume' in line]
    entry={'language':lang,'path':str(file.relative_to(ROOT)),'size_bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'duration_seconds':float(info['format']['duration']),'width':video['width'],'height':video['height'],'fps':video['r_frame_rate'],'decoded_frames':int(video['nb_read_frames']),'video_codec':video['codec_name'],'pixel_format':video['pix_fmt'],'audio_codec':audio['codec_name'],'audio_channels':int(audio['channels']),'faststart':True,'complete_decode_exit':0,'review_frame_count':len(frames),'audio_volume':volume}
    result['files'].append(entry)
    print(f'PASS {lang}: 1080x1920, 30fps, 28s, 840 decoded frames, H.264 + AAC; {len(payload)/1024/1024:.2f} MiB',flush=True)
(ROOT/'verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print('PASS: both complete files decoded without errors; 32 final review frames saved',flush=True)
