import Transcoder from './transcoder';
import handler from './handler';
const transcoder = new Transcoder("https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8");

transcoder.startTranscode();

handler.listen(80, () => console.log("Listening on port 80"));