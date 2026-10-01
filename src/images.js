import { LIMITS, dataUrlBytes } from './model.js';
/** Read image headers BEFORE decoding, so enormous images cannot allocate unrestricted rasters. */
export function imageDimensions(buffer) {
  const b=new Uint8Array(buffer),v=new DataView(buffer);
  if(b.length>=24 && b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71 && b[4]===13 && b[5]===10 && b[6]===26 && b[7]===10) return {width:v.getUint32(16),height:v.getUint32(20),mime:'image/png'};
  if(b.length>=4 && b[0]===255 && b[1]===216) {
    let i=2;
    while(i+8<b.length) {
      if(b[i]!==255){i++;continue;}
      while(b[i]===255)i++;
      const marker=b[i++];
      if(marker===0xD9||marker===0xDA)break;
      if(marker===0x01||(marker>=0xD0&&marker<=0xD7))continue;
      if(i+2>b.length)break;
      const len=v.getUint16(i);
      if(len<2||i+len>b.length)break;
      if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)) return {width:v.getUint16(i+5),height:v.getUint16(i+3),mime:'image/jpeg'};
      i+=len;
    }
  }
  throw new Error('Use a valid PNG or JPG image. PDF, SVG and damaged files are not supported.');
}
export function checkImageDimensions({width,height}) {
  if(!width||!height||width>16000||height>16000||width*height>LIMITS.pixels) throw new Error('This image exceeds the 16 megapixel limit. Resize it before importing.');
}
function decodeURL(url) {return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The image is damaged or cannot be decoded.'));image.src=url;});}
export async function readImage(file) {
  if(file.size>LIMITS.bytes)throw new Error('Images must be 10 MB or smaller.');
  if(!/\.(png|jpe?g)$/i.test(file.name)||!['image/png','image/jpeg',''].includes(file.type))throw new Error('Choose a PNG, JPG or JPEG file. PDF is not supported.');
  const dims=imageDimensions(await file.arrayBuffer());checkImageDimensions(dims);
  const url=URL.createObjectURL(file);
  try { const image=await decodeURL(url);checkImageDimensions({width:image.naturalWidth,height:image.naturalHeight});return {image,url,width:image.naturalWidth,height:image.naturalHeight}; }
  catch(error){URL.revokeObjectURL(url);throw error;}
}
export async function decodeEmbedded(dataURL, expectedWidth, expectedHeight) {
  const comma=dataURL.indexOf(','),raw=atob(dataURL.slice(comma+1));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const dims=imageDimensions(bytes.buffer);checkImageDimensions(dims);
  const image=await decodeURL(dataURL);
  if(image.naturalWidth!==expectedWidth||image.naturalHeight!==expectedHeight)throw new Error('Embedded image dimensions do not match the project.');
  return {image,url:dataURL,width:image.naturalWidth,height:image.naturalHeight};
}
export async function compressBackground(image) {
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export is not supported in this browser.');
  ctx.drawImage(image,0,0);
  let url=canvas.toDataURL('image/png');if(dataUrlBytes(url)<=LIMITS.embeddedBytes)return url;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
  for(const quality of [0.88,0.72,0.56,0.4,0.25]) {url=canvas.toDataURL('image/jpeg',quality);if(dataUrlBytes(url)<=LIMITS.embeddedBytes)return url;}
  throw new Error('The background cannot fit within 2 MB. Resize the original image or export without the background.');
}
