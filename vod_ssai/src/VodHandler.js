const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
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
            masterPlaylist.on('close',() => res(lineArray));
        });
    }

    getBaseUrl() {
        return this.url.split('/').pop().join();
    }

    //Make endpoints dynamic
    replacePlaylistsWithExpressEndpoints(manifest, baseUrl) {
        const videoStreamRegex = /#EXT-X-STREAM-INF/gm;
        const audioStreamRegex = /#EXT-X-MEDIA:TYPE=AUDIO/gm;

        manifest.forEach((line,index) => {
            if (line.match(videoStreamRegex)) {
                const subPlaylist = manifest[index + 1];
                manifest[index + 1] = `http://localhost:7003/generate_dynamic_playlist?subPlaylistUrl=${baseUrl}/${subPlaylist}&format=video`;
            }
            if (line.match(audioStreamRegex)) {
                const originalUriValue = fetchValueFromManifestMetadata(line,"URI=");
                var re = new RegExp(originalUriValue,"g");
                const replacedPlaylist = line.replace(re,`http://localhost:7003/generate_dynamic_playlist?subPlaylistUrl=${baseUrl}/${originalUriValue}&format=audio`);
                manifest[index] = replacedPlaylist;
            }

        })

        return manifest;

    }

    static streamToArray(streamData,format,baseUrl) {
        const audioMediaRegex = /.ts/gm
        const replacedManifestStream = streamData.split('\n')
            .map(stream => {
                if (stream.includes("#EXT-X-TARGETDURATION")) {
                    //Will need to dynamically parse ad duration here
                    const duration = 10;
                    return `#EXT-X-TARGETDURATION:${duration}`
                }
                if (stream.match(audioMediaRegex)) {
                    //Probs needs to match fileBackCount
                    
                    //File directories may look like ../../file so need to parse this and pop the corresponding amount off the base
                    const match = /\..\//gm
                    const fileBackCount = Array.isArray(stream.match(match)) ? stream.match.length : 0
                    // console.log(fileBackCount.length);
                    // if(!!fileBackCount.length) {
                        const audioUrl = stream.split('/').slice(fileBackCount).join('/');
                    // }
                    let baseUrlForPlaylistArray = baseUrl.split('/');
                    for (let i = 0; i < fileBackCount; i++) {
                        baseUrlForPlaylistArray.pop();
                    }

                    return `${baseUrlForPlaylistArray.join('/')}/${audioUrl}`;
                }
                return stream;
            });

        // //First instance of media files so ad is inserted at the start
        const firstStreamInstance = replacedManifestStream.findIndex(stream => stream.includes("#EXTINF"));
        console.log(firstStreamInstance);
        replacedManifestStream.splice(firstStreamInstance,0,"#EXT-X-DISCONTINUITY");
        replacedManifestStream.splice(firstStreamInstance,0,`https://hboremixbucket.s3.amazonaws.com/ads/ad_${format}.ts`);
        //Ad duration needs to be dynamic
        replacedManifestStream.splice(firstStreamInstance,0,"#EXTINF:10.0");

        return replacedManifestStream.join("\n");
    }
}

module.exports = VodHandler