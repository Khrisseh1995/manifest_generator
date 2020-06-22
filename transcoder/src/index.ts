import Transcoder from './transcoder_class';

const transcoder = new Transcoder("https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8");

transcoder.startTranscode();