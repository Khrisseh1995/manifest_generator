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

const uploadManifestChunk = (writeIndex: number): Promise<chunkInformation> => {

    let linesToReturn: Array<string> = [];
    let returnObject: = {} as chunkInformation;
    return new Promise((res, rej) => {
        const myInterface = readline.createInterface({
            input: fs.createReadStream('../streams/test.m3u8')
        });

        let lineno = 0;

        myInterface.on('line', (line) => {
            if (lineno === 0) {
                returnObject['manifest_declaration'] = line;
            }

            if (lineno === 1) {
                returnObject['manifest_version'] = line;
            }

            if (lineno === 2) {
                returnObject['target_duration'] = line;
            }

            if (lineno === 3) {
                returnObject['media_segment'] = line;
            }


            if ((writeNumber - 1) === 0) {
                if (lineno === 5 || lineno === 6) {
                    linesToReturn.push(line);
                }
            }

            if ((writeNumber - 1) === 1) {
                if (lineno === 7 || lineno === 8) {
                    linesToReturn.push(line);
                }
            }

            if ((writeNumber - 1) === 2) {
                if (lineno === 9 || lineno === 10) {
                    linesToReturn.push(line);
                }
            }

            if ((writeNumber - 1) === 3) {
                if (lineno === 11 || lineno === 12) {
                    linesToReturn.push(line);
                }
            }

            if (lineno === 12 || lineno === 13) {
                linesToReturn.push(line);
            }

            if (lineno === 14 || lineno === 15) {
                linesToReturn.push(line);
            }

            if (lineno === 16 || lineno === 17) {
                linesToReturn.push(line);
            }

            if (lineno === 18 || lineno === 19) {
                linesToReturn.push(line);
            }

            if (lineno === 20 || lineno === 21) {
                linesToReturn.push(line);
            }

            if (lineno === 22 || lineno === 23) {
                linesToReturn.push(line);
            }
            lineno++;
        });

        myInterface.on('close', (data: string) => {
            if (!!linesToReturn) {
                returnObject['file_name'] = linesToReturn[1];
                returnObject['ext_info'] = linesToReturn[0];
            }
            res(returnObject);
        });
    })

}

const uploadToS3 = (key: string, body: string) => {
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

const postToManifestGenerator = async (manifestInformation: expressParam) => {
    console.log(manifestInformation);
    const { data } = await axios.post("http://manifest-generator/create_manifest", manifestInformation);
    console.log(data);
}

const run = async () => {
    const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
        "-fflags",
        "+genpts",
        '-re',
        '-i',
        'https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8 ',
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
        console.log(ffmpegOutput);
        const isMatch = ffmpegOutput.match(regex);
        if (isMatch) {
            const chunk = await uploadManifestChunk(writeNumber);
            uploadToS3(chunk.file_name, `../streams/${chunk.file_name}`)
            const objectToSend = {
                epochTime: moment().valueOf(),
                manifestInformation: chunk,
                location: `radio_output/${chunk.file_name}`
            }
            writeNumber += 1;
            await postToManifestGenerator(objectToSend);
        }
        console.log("Match ", writeNumber);
    });
}

run();