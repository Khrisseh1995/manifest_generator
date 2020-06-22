require('dotenv').config()
import { spawn } from 'child_process';
import AWS from 'aws-sdk';
import fs from 'fs';
import moment from 'moment';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
})
import readline from 'readline';
import axios from 'axios';

let writeNumber = 0;

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
    constructor(private streamUrl: string) {}

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
                const manifestMetadata = manifestArray.splice(0, 4);
                const noDiscontinuityArray = manifestArray.filter(manifestMetadata => manifestMetadata != "#EXT-X-DISCONTINUITY");
                testReturnObject['manifest_declaration'] = manifestMetadata[0];
                testReturnObject['manifest_version'] = manifestMetadata[1];
                testReturnObject['target_duration'] = manifestMetadata[2];
                testReturnObject['media_segment'] = manifestMetadata[3];
                testReturnObject['file_name'] = noDiscontinuityArray[noDiscontinuityArray.length - 1];
                testReturnObject['ext_info'] = noDiscontinuityArray[noDiscontinuityArray.length - 2];
                console.log(testReturnObject);
                res(testReturnObject);
            });
        })

    }

    private uploadToS3(key: string, body: string) {
        if (!key || !body) {
            return;
        }

        console.log("Upload to S3");

        s3.upload({
            Bucket: 'hboremixbucket',
            Key: `radio_output/${key}`,
            Body: fs.readFileSync(body)
        })
            .promise()
            .then(data => console.log(data))
            .catch(e => console.log(e));
    }

    private async postToManifestGenerator(manifestInformation: expressParam) {
        // console.log(manifestInformation);
        const { data } = await axios.post("http://manifest-generator/create_manifest", manifestInformation);
        // console.log(data);
    }

    public async startTranscode() {
        const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
            "-fflags",
            "+genpts",
            '-re',
            '-i',
            this.streamUrl,
            // 'https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8 ',
            "-strict",
            "-2",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            "-ac",
            "2",
            "-ar",
            "44100",
            "-hls_list_size",
            "10",
            "-hls_flags",
            "delete_segments+append_list+split_by_time",
            '-hls_time',
            '6',
            '../streams/test.m3u8'
        ]);

        ffmpeg.stderr.on('data', async data => {
            const regex = /test[0-9]+.ts/gm;
            const ffmpegOutput = data.toString();
            // console.log(ffmpegOutput);
            const isMatch = ffmpegOutput.match(regex);
            if (isMatch) {
                const chunk = await this.uploadManifestChunk();
                this.uploadToS3(chunk.file_name, `../streams/${chunk.file_name}`)
                const objectToSend = {
                    epochTime: moment().valueOf(),
                    manifestInformation: chunk,
                    location: `radio_output/${chunk.file_name}`
                }
                await this.postToManifestGenerator(objectToSend);
            }
            // console.log("Match ", writeNumber);
        });
    }
}