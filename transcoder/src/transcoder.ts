require('dotenv').config()
import { spawn } from 'child_process';
import AWS from 'aws-sdk';
import fs, { promises } from 'fs';
import moment from 'moment';
import readline from 'readline';
import axios from 'axios';
let promiseCounter = 0;
let promisesArray: any = [];
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
})

interface chunkInformation {
    [key: string]: string;
    manifest_declaration: string;
    manifest_version: string;
    target_duration: string;
    media_segment: string;
    file_name: string;
    ext_info: string;
}

interface expressParam {
    epochTime: number;
    manifestInformation: chunkInformation;
    location: string;
}

export default class Transcoder {
    constructor(private streamUrl: string) { }
    private async runPromisesInSeries() {
        for await (const promise of promisesArray) {
            console.log(promise);
        }
        promisesArray = [];
    }

    private getStreamVariants() {

    }

    private uploadManifestChunk(): Promise<chunkInformation> {
        const manifestArray: Array<string> = [];
        const testReturnObject = {} as chunkInformation;

        return new Promise((res, rej) => {
            const myInterface = readline.createInterface({
                input: fs.createReadStream('../streams/test.m3u8')
            });

            myInterface.on('line', line => manifestArray.push(line));

            myInterface.on('close', () => {
                console.log("Manifest Array:");
                //Extract metadata info from manifest
                const manifestMetadata = manifestArray.splice(0, 5);
                manifestMetadata.splice(3, 1);
                //TODO: Probs want to write this to the manifest
                const noDiscontinuityArray = manifestArray.filter(manifestMetadata => manifestMetadata != "#EXT-X-DISCONTINUITY");
                testReturnObject['manifest_declaration'] = manifestMetadata[0];
                testReturnObject['manifest_version'] = manifestMetadata[1];
                testReturnObject['target_duration'] = manifestMetadata[2];
                testReturnObject['media_segment'] = manifestMetadata[3];
                testReturnObject['file_name'] = noDiscontinuityArray[noDiscontinuityArray.length - 1];
                testReturnObject['ext_info'] = noDiscontinuityArray[noDiscontinuityArray.length - 2];
                // console.log(testReturnObject);
                res(testReturnObject);
            });
        })

    }

    private async uploadToS3(key: string, body: string) {
        if (!key || !body) {
            return;
        }

        // const data = await s3.upload({
        s3.upload({
            Bucket: 'hboremixbucket',
            Key: `radio_output/${key}`,
            Body: fs.readFileSync(body)
        })
            .promise()
            .then(x => console.log(x));
        // .then(async data => {
        // console.log(data);
        // console.log(data);
        // const promiseTwo = this.postToManifestGenerator(objectToSend);;
        // promisesArray.push(promise1);
        // promisesArray.push(promiseTwo);
        // })
        // .catch(e => console.log(e));
    }

    private async postToManifestGenerator(manifestInformation: expressParam): Promise<void> {

        const { data } = await axios.post("http://manifest-generator/create_manifest", manifestInformation);
        console.log(manifestInformation);
    }

    public async startTranscode(): Promise<void> {
        //Random ffmpeg flags
        // const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
        //     "-fflags",
        //     "+genpts",
        //     '-re',
        //     '-i',
        //     this.streamUrl,
        //     "-strict",
        //     "-2",
        //     "-c:a",
        //     "aac",
        //     "-b:a",
        //     "96k",
        //     "-ac",
        //     "2",
        //     "-ar",
        //     "44100",
        //     "-hls_list_size",
        //     "10",
        //     "-hls_flags",
        //     "delete_segments+append_list+split_by_time",
        //     '-force_key_frames',
        //     "expr:'gte(t,n_forced*6)'",
        //     '-hls_time',
        //     '6',
        //     '../streams/test.m3u8'
        // ]);

        // Video Copy Params
        //ffmpeg -re -i https://live.rte.ie/live/b/channel3/news.isml/.m3u8?dvr_window_length=30 -codec copy -map p:0 -f segment -segment_list playlist.m3u8 \
        //-segment_list_flags +live -segment_time 6 -segment_list_size 5 out%03d.ts
        //Using segment type
        const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
            "-re",
            "-i",
            "https:live.rte.ie/live/b/channel3/news.isml/.m3u8?dvr_window_length=30",
            "-codec",
            "copy",
            "-map",
            "p:0",
            "-f",
            "segment",
            "-segment_list",
            "../streams/test.m3u8",
            "-segment_list_flags",
            "+live",
            "-segment_time",
            "6",
            "-segment_list_size",
            "5",
            "../streams/test%03d.ts"
        ])

        // const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
        //     "-fflags",
        //     "+genpts",
        //     "-re",
        //     "-i",
        //     "https://live.rte.ie/live/b/channel3/news.isml/.m3u8?dvr_window_length=30",
        //     "-map",
        //     "p:0",
        //     "-strict",
        //     "-2",
        //     "-y",
        //     "-vcodec",
        //     "libx264",
        //     "-acodec",
        //     "aac",
        //     // "copy",            
        //     "-hls_list_size",
        //     "5",
        //     "-hls_flags",
        //     "delete_segments",
        //     // '-force_key_frames',
        //     // "expr:'gte(t,n_forced*6)'",
        //     '-hls_time',
        //     '6',
        //     '../streams/test.m3u8'
        // ])

        //Audio Copy Params
        // const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [            
        //     "-fflags",
        //     "+genpts",
        //     "-re",
        //     "-i",
        //     this.streamUrl,
        //     // "-strict",
        //     // "-2",
        //     "-y",
        //     "-c",
        //     "copy",            
        //     "-hls_list_size",
        //     "10",                        
        //     "-hls_flags",
        //     "delete_segments",
        //     '-force_key_frames',
        //     "expr:'gte(t,n_forced*6)'",
        //     '-hls_time',
        //     '6',                
        //     '../streams/test.m3u8'
        // ])
        //https://docs.peer5.com/guides/production-ready-hls-vod/
        //Another test
        // ffmpeg -i beach.mkv -vf scale=w=1280:h=720:force_original_aspect_ratio=decrease -c:a aac -ar 48000 -b:a 128k -c:v h264 -profile:v main -crf 20 -g 48 -keyint_min 48 -sc_threshold 0 -b:v 2500k -maxrate 2675k -bufsize 3750k -hls_time 4 -hls_playlist_type vod -hls_segment_filename beach/720p_%03d.ts beach/720p.m3u8
        // const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
        //     "-fflags",
        //     "+genpts",
        //     "-re",
        //     "-i",
        //     this.streamUrl,
        //     // "-strict",
        //     // "-2",
        //     "-y",
        //     // "-c",
        //     // "copy",     
        //     '-c:a',
        //     'aac',
        //     '-ar',
        //     '48000',
        //     '-b:a',
        //     '128k',
        //     '-crf',
        //     '20',
        //     "-g",
        //     "48",
        //     "-keyint_min",
        //     "48",
        //     "-sc_threshold",
        //     "0",
        //     "-hls_list_size",
        //     "10",
        //     "-hls_flags",
        //     "delete_segments",
        //     '-force_key_frames',
        //     "expr:'gte(t,n_forced*6)'",
        //     '-hls_time',
        //     '6',
        //     '../streams/test.m3u8'
        // ])




        ffmpeg.stderr.on('data', async data => {
            const regex = /test[0-9]+.ts/gm;
            const ffmpegOutput = data.toString();
            // console.log(ffmpegOutput);
            const isMatch = ffmpegOutput.match(regex);
            if (isMatch) {
                console.log("Is Match");
                const chunk = await this.uploadManifestChunk();
                const objectToSend: expressParam = {
                    epochTime: moment().valueOf(),
                    manifestInformation: chunk,
                    location: `radio_output/${chunk.file_name}`
                }

                this.uploadToS3(chunk.file_name, `../streams/${chunk.file_name}`);
                // promisesArray.push(this.postToManifestGenerator(objectToSend));
                // promiseCounter++;
                // await this.uploadToS3();
                if (promiseCounter % 3 === 0) {
                    this.runPromisesInSeries();
                }
                await this.postToManifestGenerator(objectToSend);
            }
        });
    }
}
