/**
 * Process is returning too early, not all manifett files are being written fully.
 */

const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const regex = /m3u8/gm
const { s3 } = require('./aws');
let baseUrlForPlaylist = '';
let baseUrlForVideo = '';
let baseUrlForAudio = '';
const { v4: uuidv4 } = require('uuid');
const { fetchValueFromManifestMetadata } = require('./util');

class VodHandler {
    constructor(url) {
        this.url = url;        
    }

    getMasterPlaylist() {
        return new Promise(async (res,rej) => {
            const { data } = await axios.get(this.url);
            fs.writeFileSync('../streams/master_playlist.m3u8',data);
            const masterPlaylist = readline.createInterface({
                input: fs.createReadStream('../streams/master_playlist.m3u8')
            });

            const lineArray = [];
            masterPlaylist.on('line',line => lineArray.push(line));
            masterPlaylist.on('close',() => {
                res(lineArray)
            });
        });
    }

    getBaseUrl() {
        const urlArray = this.url.split('/');
        urlArray.pop();
        baseUrlForPlaylist = urlArray.join('/');
    }

    //Make endpoints dynamic
    replacePlaylistsWithExpressEndpoints(manifest,baseUrl) {
        const videoStreamRegex = /#EXT-X-STREAM-INF/gm;
        const audioStreamRegex = /#EXT-X-MEDIA:TYPE=AUDIO/gm;

        manifest.forEach((line,index) => {
            if (line.match(videoStreamRegex)) {
                const subPlaylist = manifest[index + 1];
                manifest[index + 1] = `http://localhost:7003/generate_dynamic_playlist?subPlaylistUrl=https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/${subPlaylist}`;
            }
            if (line.match(audioStreamRegex)) {
                const originalUriValue = line
                    .split(',')
                    .filter(stream => stream.includes("URI="))[0]
                    .split('=')[1].replace(/"/gm, "")             ;

                var re = new RegExp(originalUriValue,"g");                
                const replacedPlaylist = line.replace(re,`http://localhost:7003/generate_dynamic_playlist?subPlaylistUrl=https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/${originalUriValue}`);
                manifest[index] = replacedPlaylist;
            }

        })

        return manifest;

    }

    static streamToArray(streamData,format, baseUrl, showAd) {
        const audioMediaRegex = /.ts/gm
        const replacedManifestStream = streamData.split('\n')
            .map(stream => {
                if (stream.includes("#EXT-X-TARGETDURATION")) {
                    //Will need to dynamically parse ad duration here
                    const duration = 10;
                    return `#EXT-X-TARGETDURATION:${duration}`
                }
                if (stream.match(audioMediaRegex)) {
                    const audioUrl = stream.split('/').slice(1).join('/');
                    const match = /\..\//gm
                    const fileBackCount = stream.match(match);
                    let baseUrlForPlaylistArray = baseUrl.split('/');
                    for (let i = 0; i < fileBackCount.length; i++) {
                        baseUrlForPlaylistArray.pop();
                    }

                    return `${baseUrlForPlaylistArray.join('/')}/${audioUrl}`;
                }
                return stream;
            });

        const firstStreamInstance = replacedManifestStream.findIndex(stream => stream.includes("#EXTINF"));
        // replacedManifestStream.splice(firstStreamInstance,0,"#EXT-X-DISCONTINUITY");
        // replacedManifestStream.splice(firstStreamInstance,0,`https://hboremixbucket.s3.amazonaws.com/ads/ad_${format}.ts`);
        // replacedManifestStream.splice(firstStreamInstance,0,"#EXTINF:10.0");
        return replacedManifestStream.join("\n");
    }
}

module.exports = VodHandler