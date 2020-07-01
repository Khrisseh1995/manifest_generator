const axios = require('axios');
const baseUrl = "https://live.rte.ie/live/b/channel3/news.isml/";
const audioManifestFile = "https://live.rte.ie/live/b/channel3/news.isml/news-audio_128k=128000.m3u8?dvr_window_length=30";
const videoManifestFile = "https://live.rte.ie/live/b/channel3/news.isml/news-video=2000000.m3u8?dvr_window_length=30";
const { s3 } = require('./aws');

const run = async () => {
    const { data: audioManifestData } = await axios.get(audioManifestFile);
    const { data: videoManifestData } = await axios.get(videoManifestFile);

    const audioManifest = audioManifestData.split('\n').map((manifest,index) => {
        const audioManifestRegex = /.aac/gm;

        if (manifest.includes("aac")) {
            return `${baseUrl}/${manifest}\n`;
        }
        return `${manifest}\n`
    }).join("");

    const videoManifest = videoManifestData.split('\n').map((manifest,index) => {

        const videoManfiestRegex = /.ts/gm;
        if (manifest.includes("ts")) {
            return `${baseUrl}/${manifest}\n`;
        }
        return `${manifest}\n`
    }).join("");

    console.log(audioManifest)
    console.log(videoManifest)

    const manfiestData = [
        {
            key: 'audio.m3u8',
            file: audioManifest
        },
        {
            key: 'video.m3u8',
            file: videoManifest
        }
    ];

    manfiestData.forEach(manifest => {
        const { key,file } = manifest;
        const params = {
            Bucket: 'hboremixbucket',
            ACL: 'public-read',
            ContentType: 'application/vnd.apple.mpegurl',
            Key: `live_manifests/${key}`,
            Body: Buffer.from(file)
        }

        s3.upload(params).promise().then(data => console.log(data));
    });
}


// run();
setInterval(() => run(), 6000);

