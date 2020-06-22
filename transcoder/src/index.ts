import Transcoder from './transcoder';

const transcoder = new Transcoder("https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8");

transcoder.startTranscode();