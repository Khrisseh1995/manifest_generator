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
const {fetchValueFromManifestMetadata} = require('./util');

class VodHandler {
    constructor(url) {
        this.url = url;
        this.fileUuid = uuidv4();
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

    constructMasterPlaylist(manifestInformation) {
        const generatedPlaylist = fs.createWriteStream('../streams/generated_master_playlist.m3u8');
        const { metadata,audioStreams,variantStreams } = manifestInformation;

        metadata.forEach(metadata => {
            generatedPlaylist.write(`${metadata}\n`);
        });

        audioStreams.forEach(stream => {
            const { playlist } = stream;

            const originalUriValue = playlist
                .split(',')
                .filter(stream => stream.includes("URI="))[0]
                .split('=')[1];

            const params = {
                Bucket: 'hboremixbucket',
                //Gonna have to also make this dynamic, won't matter when playlists are on the fly though
                Key: `manifests/${this.fileUuid}/4928000_audio.m3u8`
            }

            var re = new RegExp(originalUriValue,"g");
            const signedUrl = s3.getSignedUrl('getObject',params)
            const replacedPlaylist = playlist.replace(re,`"${signedUrl}"`);
            generatedPlaylist.write(`${replacedPlaylist}\n`);
            generatedPlaylist.write('\n');
        })

        variantStreams.forEach(stream => {
            const { streamManifest,audioPath,bandwidth,variantMetadata } = stream;

            const params = {
                Bucket: 'hboremixbucket',
                Key: `manifests/${this.fileUuid}/${bandwidth}_video.m3u8`
            }

            const signedUrl = s3.getSignedUrl('getObject',params);
            generatedPlaylist.write(`${variantMetadata}\n`);
            generatedPlaylist.write(`${signedUrl}\n`);
        });



        const params = {
            Bucket: 'hboremixbucket',
            ACL: 'public-read',
            ContentType: 'application/vnd.apple.mpegurl',
            Key: `manifests/${this.fileUuid}/master_playlist.m3u8`,
            Body: fs.createReadStream('../streams/generated_master_playlist.m3u8')
        }

        s3.upload(params).promise().then(data => console.log(data));
    }

    async getSubPlaylists() {
        const masterPlaylist = await this.getMasterPlaylist();
        const variantStreamRegex = /#EXT-X-STREAM-INF/gm;
        const audioStreamRegex = /#EXT-X-MEDIA:TYPE=AUDIO/gm;
        //CANNY assumption more than likely have subtitles or other streams, fine for now but will need to change when subtitles/keyframes are incorporated
        const metaDataCutoff = masterPlaylist.findIndex(playlist => playlist.match(audioStreamRegex));
        const metadata = masterPlaylist.splice(0,3);

        const audioStreams = masterPlaylist
            .map((playlist,index) => {
                if (playlist.match(audioStreamRegex)) {
                    //Group ID that ties the audio to the variant stream
                    const groupId = fetchValueFromManifestMetadata(playlist, /GROUP-ID/gm);                    

                    return {
                        playlist,
                        groupId
                    };
                }
            })
            .filter(playlist => !!playlist);

        const variantStreams = masterPlaylist
            .map((playlist,index) => {
                if (playlist.match(variantStreamRegex)) {
                    const audioMatch = /AUDIO=/gm;
                    const bandwidthMatch = /BANDWIDTH=/gm;                                        
                    const groupId = fetchValueFromManifestMetadata(playlist, audioMatch);
                    const bandwidth = fetchValueFromManifestMetadata(playlist, bandwidthMatch);                                        

                    const matchingAudioId = audioStreams.find(audioStream => audioStream.groupId === groupId);
                    return {
                        bandwidth,
                        variantMetadata: playlist,
                        streamManifest: masterPlaylist[index + 1],
                        audioPath: this.parseAudioStreams(matchingAudioId.playlist)
                    }
                }
            })
            .filter(playlist => !!playlist);
        
        return {
            audioStreams,
            variantStreams,
            metadata
        }

    }

    parseAudioStreams(audioTag) {        
        const URIMatch = /URI=/gm;        
        const audioStream = audioTag.split(',')
            .filter(audioTag => audioTag.match(URIMatch))[0]
            .split('=')[1];
        return audioStream
    }

    async callManifestStreams(audioManifest,videoManifest,fileName) {
        const videoManifestUrl = `${baseUrlForPlaylist}/${videoManifest}`;
        let audioManifestUrl = `${baseUrlForPlaylist}/${audioManifest}`
        audioManifestUrl = audioManifestUrl.replace(/"/gm,"");

        const { data: videoStreamData } = await axios.get(videoManifestUrl);
        const { data: audioStreamData } = await axios.get(audioManifestUrl);

        this.streamToArray(audioStreamData,fileName,"audio");
        this.streamToArray(videoStreamData,fileName,"video");        
    }



    async streamToArray(streamData,fileName,format) {
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
                    let baseUrlForPlaylistArray = baseUrlForPlaylist.split('/');
                    for (let i = 0; i < fileBackCount.length; i++) {
                        baseUrlForPlaylistArray.pop();
                    }

                    return `${baseUrlForPlaylistArray.join('/')}/${audioUrl}`;                    
                }
                return stream;
            });

        const firstStreamInstance = replacedManifestStream.findIndex(stream => stream.includes("#EXTINF"));
        replacedManifestStream.splice(firstStreamInstance,0,"#EXT-X-DISCONTINUITY");
        replacedManifestStream.splice(firstStreamInstance,0,`https://hboremixbucket.s3.amazonaws.com/ads/ad_${format}.ts`);
        replacedManifestStream.splice(firstStreamInstance,0,"#EXTINF:10.0");

        const audioWriteStream = fs.createWriteStream(`../streams/${fileName}_${format}.m3u8`);


        replacedManifestStream.forEach(stream => audioWriteStream.write(`${stream}\n`));

        audioWriteStream.on('close',async () => {
            
        })
        const parameters = {
            Bucket: 'hboremixbucket',
            Key: `manifests/${this.fileUuid}/${fileName}_${format}.m3u8`,
            Body: fs.createReadStream(`../streams/${fileName}_${format}.m3u8`)
        }
        await s3.upload(parameters).promise();
    }

    async run() {
        this.getBaseUrl();
        const subPlaylists = await this.getSubPlaylists();
        const { variantStreams,metadata,audioStreams } = subPlaylists;
        this.constructMasterPlaylist(subPlaylists)
        variantStreams.forEach(stream => {
            const { streamManifest,audioPath,bandwidth } = stream;
            this.callManifestStreams(audioPath,streamManifest,bandwidth);
        })
    }
}

module.exports = VodHandler