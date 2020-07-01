const express = require('express');
const cors = require('cors');
const VodHandler = require('./VodHandler');
const app = express();
const cookieParser = require('cookie-parser');
const axios = require('axios');
const bodyParser = require('body-parser');

app.use(cookieParser());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/manifest",(req,res) => {
    res.setHeader('Content-type','application/x-mpegURL');
    res.sendFile(__dirname + '/master_playlist_to_serve.m3u8')
})

app.get('/return_live_manifest',(req,res) => {
    res.setHeader('Content-type','application/x-mpegURL');
    res.sendFile(__dirname + '/live_playlist.m3u8');
});

app.post('/insert_vod_preroll', (req,res) => {
    const { streamUrl } = req.body;
    const vodHandler = new VodHander(streamUrl)
    vodHandler.run();
    res.setHeader('Content-type','application/x-mpegURL');
    res.sendFile(__dirname + '/master_playlist_to_serve.m3u8')
});

app.get("/manifest_from_s3",(req,res) => {
    res.sendFile("https://hboremixbucket.s3.amazonaws.com/live_manifests/fake_live_master.m3u8");
});

app.get("/generate_master_playlist", async (req, res) => {
    const {baseUrl, masterPlaylist} = req.query;
    console.log(masterPlaylist)
    const vodHandler = new VodHandler(masterPlaylist);    
    const data = await vodHandler.getMasterPlaylist();
    const replacedMasterPlaylist =vodHandler.replacePlaylistsWithExpressEndpoints(data);
    const replacedMasterFile = replacedMasterPlaylist.join("\n");
    res.setHeader('Content-type','application/x-mpegURL');
    res.send(replacedMasterFile);
    // replacedMasterPlaylist.forEach(playlist => console.log(playlist));    
    // res.send(req.query);
});

app.get('/generate_dynamic_playlist', async (req, res) => {
    const {subPlaylistUrl} = req.query;
    const {data: playlist} = await axios.get(subPlaylistUrl);
    const vodHandler = VodHandler.streamToArray(playlist, "video", "https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s");    
    console.log(vodHandler);
    // console.log(playlist)
    res.setHeader('Content-type','application/x-mpegURL');
    return res.send(vodHandler);    
});

app.get("/low_bandwidth_endpoint_audio",async (req,res) => {
    //Move to service
    const baseUrl = "https://live.rte.ie/live/b/channel3/news.isml/";

    const { data: audioManifestData } = await axios.get("https://live.rte.ie/live/b/channel3/news.isml/news-audio_128k=128000.m3u8?dvr_window_length=30");
    const cookie = req.cookies.showAdAudio;
    const audioManifestArray = audioManifestData.split('\n');
    // const audioManifestArray = audioManifestData.split('\n')
    if (cookie === undefined) {
        res.cookie('showAdAudio',true,{
            httpOnly: true
        });
        audioManifestArray[5] = "#EXT-X-TARGETDURATION:10";
        audioManifestArray.splice(8,1);
        audioManifestArray.splice(8,1);
        const adArray = [
            '#EXT-X-DISCONTINUINTY',
            "#EXTINF:10, no desc",
            "https://hboremixbucket.s3.amazonaws.com/ads/ad_audio.ts",
            "#EXT-X-DISCONTINUINTY"
        ]

        audioManifestArray.splice(10, 0, ...adArray);

        console.log(audioManifestArray);
        console.log('Audio cookie created successfully');
    } else {
        // yes, cookie was already present 
        console.log('Audio cookie exists',cookie);
    }
    const audioManifest = audioManifestArray.map((manifest,index) => {
        const audioManifestRegex = /.aac/gm;
        if(manifest.includes("hboremixbucket")) {
            return manifest;
        }
        if (manifest.includes("aac")) {
            return `${baseUrl}/${manifest}\n`;
        }
        return `${manifest}\n`
    }).join("");

    // console.log(audioManifest);
    res.setHeader('Content-type','application/x-mpegURL');
    return res.send(audioManifest);
});

app.get("/low_bandwidth_endpoint_video",async (req,res) => {
    //Move to service
    const baseUrl = "https://live.rte.ie/live/b/channel3/news.isml/";

    const { data: videoManifestData } = await axios.get("https://live.rte.ie/live/b/channel3/news.isml/news-video=2000000.m3u8?dvr_window_length=30");

    const cookie = req.cookies.showAdVideo;
    const videoManifestArray = videoManifestData.split('\n')
    if (!cookie) {
        res.cookie('showAdVideo',true,{
            httpOnly: true
        });
        videoManifestArray[5] = "#EXT-X-TARGETDURATION:10";
        videoManifestArray.splice(8,1);
        videoManifestArray.splice(8,1);
        const adArray = [
            '#EXT-X-DISCONTINUINTY',
            "#EXTINF:10, no desc",
            "https://hboremixbucket.s3.amazonaws.com/ads/ad_video.ts",
            "#EXT-X-DISCONTINUINTY"
        ]
        videoManifestArray.splice(10 ,0, ...adArray);        

        console.log(videoManifestArray);
        console.log('Video cookie created successfully');
    } else {
        // yes, cookie was already present 
        console.log('Video cookie exists',cookie);
    }
    const videoManifest = videoManifestArray.map((manifest,index) => {

        const videoManfiestRegex = /.ts/gm;
        if(manifest.includes("hboremixbucket")) {
            return manifest;
        }
        if (manifest.includes("ts")) {
            return `${baseUrl}/${manifest}\n`;
        }
        return `${manifest}\n`
    }).join("");

    res.setHeader('Content-type','application/x-mpegURL');
    return res.send(videoManifest);
});

app.get('/send_fake_local_manifest',(req,res) => {
    res.setHeader('Content-type','application/x-mpegURL');
    res.sendFile(__dirname + '/fake_live_master.m3u8');
});


app.listen(80, () => console.log("Listneing on port 7005"));