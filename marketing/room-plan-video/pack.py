"""Package local promotional deliverables, then verify every ZIP entry."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out'
entries = {
    'room-plan-en-1080x1920.mp4': OUT / 'room-plan-en-1080x1920.mp4',
    'room-plan-zh-CN-1080x1920.mp4': OUT / 'room-plan-zh-CN-1080x1920.mp4',
    'cover-en.jpg': OUT / 'cover-en.jpg',
    'cover-zh-CN.jpg': OUT / 'cover-zh-CN.jpg',
    'room-plan-en.srt': OUT / 'room-plan-en.srt',
    'room-plan-zh-CN.srt': OUT / 'room-plan-zh-CN.srt',
    '发布文案.md': ROOT / 'post-copy.md',
}
instructions = '''Room / plan 宣传素材包

1. 英语国际版：room-plan-en-1080x1920.mp4
2. 中文版：room-plan-zh-CN-1080x1920.mp4
3. 对应的 cover 图片可作为发布封面。
4. 发布文案.md 中有两种语言的配文；发布前把项目网址占位符替换成实际上线网址。
5. MP4 已带音乐、音效和画面文字，可以直接上传。SRT 为可选字幕，不必再重复烧录。

两版均为 28 秒、1080×1920 竖屏、30 FPS，H.264 视频与 AAC 音轨。
目前仅完成本地制作，没有对外发布。请使用产品上线后的网址作为推广链接。
动画和音轨为本项目原创，真实界面截图来自本地示例；制作参考与源码留在项目 marketing/room-plan-video/。
'''
target = OUT / 'room-plan-promo-kit.zip'
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    for name, source in entries.items():
        archive.write(source, name)
    archive.writestr('使用说明.txt', instructions)

with ZipFile(target) as archive:
    assert archive.testzip() is None, 'ZIP checksum check failed'
    assert set(archive.namelist()) == set(entries) | {'使用说明.txt'}
    for name, source in entries.items():
        assert archive.read(name) == source.read_bytes(), f'Content mismatch: {name}'
    assert archive.read('使用说明.txt').decode('utf-8') == instructions

verification_path = ROOT / 'verification.json'
verification = json.loads(verification_path.read_text())
verification['promo_kit'] = {
    'path': str(target.relative_to(ROOT)),
    'size_bytes': target.stat().st_size,
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'entry_count': 8,
    'complete_readback': True,
    'zip_crc_check': 'passed',
}
verification_path.write_text(json.dumps(verification, ensure_ascii=False, indent=2) + '\n')
print(f'PASS: 8 / 8 ZIP entries match the deliverables; CRC check passed; {target.stat().st_size / 1024 / 1024:.2f} MiB')
