require('dotenv').config()
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const fs = require('fs');
const chokidar = require('chokidar');
const moment = require('moment');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,    
    secretAccessKey: process.env.AWS_SECRET_KEY,    
    signatureVersion: 'v4'
})
const readline = require('readline');
const axios = require('axios');

let transportStreamIndex = 0;
let divisorUploadNumber = 0;
let writeNumber = 0;

const uploadManifestChunk = (writeIndex) => {
    
    let linesToReturn = [];
    let returnObject = {};
    return new Promise((res,rej) => {
        const myInterface = readline.createInterface({
            input: fs.createReadStream('test.m3u8')
        });

        let lineno = 0;

        myInterface.on('line',(line) => {
            if (lineno === 0) {
                returnObject['manifest_declaration'] = line;
                // console.log(line);
            }
            if (lineno === 1) {
                returnObject['manifest_version'] = line;
                // console.log(line);
            }
            if (lineno === 2) {
                returnObject['target_duration'] = line;
                // console.log(line);
            }
            if (lineno === 3) {
                returnObject['media_segment'] = line;
                // console.log(line);
            }

            if ((writeNumber - 1) === 0) {
                // console.log(line,"Number",lineno);
                if (lineno === 5 || lineno === 6) {
                    linesToReturn.push(line);
                }
            }

            if ((writeNumber - 1) === 1) {
                // console.log(line,"Number",lineno);
                if (lineno === 7 || lineno === 8) {
                    linesToReturn.push(line);
                }
            }

            // if ((writeNumber - 1) === 2) {
                // console.log(line,"Number",lineno);
                if (lineno === 9 || lineno === 10) {
                    linesToReturn.push(line);
                }
            // }

            // if ((writeNumber - 1) === 3) {
                // console.log(line,"Number",lineno);
                // if (lineno === 11 || lineno === 12) {
                    // linesToReturn.push(line);
                // }
            // }

            // if (lineno === 13 || lineno === 14) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            // if (lineno === 15 || lineno === 16) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            // if (lineno === 17 || lineno === 18) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            // if (lineno === 19 || lineno === 20) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            // if (lineno === 21 || lineno === 22) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            // if (lineno === 23 || lineno === 24) {
            //     // console.log(line);
            //     linesToReturn.push(line);
            // }

            

            lineno++;
        });

        myInterface.on('close',data => {
            if (!!linesToReturn) {
                returnObject['file_name'] = linesToReturn[1];
                returnObject['ext_info'] = linesToReturn[0];
            }
            res(returnObject);
        });
    })

}

const uploadToS3 = (key,body) => {
    console.log("Upload to S3");
    console.log(process.env.AWS_ACCESS_ID);
    if(!key || !body) {
        return;
    }
    console.log("Passed return");
    s3.upload({
        Bucket: 'hboremixbucket',
        Key: `radio_output/${key}`,
        Body: fs.readFileSync(body)
    })
        .promise()
        .then(data => console.log(data))
        .catch(e => console.log(e));
}

const postToManifestGenerator = async (manifestInformation) => {
    // const { data } = await axios.post("http://localhost:7000/create_manifest",manifestInformation);
    const { data } = await axios.post("http://manifest-generator/create_manifest",manifestInformation);

    // console.log(data);
}

const run = async () => {
    //Possible ffmpeg command for fp4
    //ffmpeg -y -i udp://@:50000 -c copy -hls_segment_type fmp4 -hls_time 6 -hls_list_size 10 -hls_flags delete_segments+append_list+split_by_time -hls_playlist_type event ~/Sites/foo/index_4000.m3u8


    const ffmpeg = spawn('../ffmpeg/ffmpeg-bin/ffmpeg',[        
        '-re',
        '-i',        
        'https://liveaudio.rte.ie/hls-radio/radio1/chunklist.m3u8 ',
        // "-force_key_frames",
        // "expr:gte(t,n_forced*2)",
        // "-sc_threshold", 
        // "0",
        '-c',
        'copy',
        "-bsf:a",
         "aac_adtstoasc",
        "-hls_segment_type",
        "fmp4",
        "-hls_list_size",
        "3",
        "-hls_flags",
        "delete_segments",
        //  "delete_segments+append_list+split_by_time",
        '-hls_time',
        '10',
        'test.m3u8'
    ]);

    ffmpeg.stderr.on('data',async data => {
        // const regex = /Opening 'test[0-9]+.ts'/gm;
       const regex = /Opening 'test[0-9]+.m4s'/gm; 
        const ffmpegOutput = data.toString();
        console.log(ffmpegOutput);
        const isMatch = ffmpegOutput.match(regex);
        if (isMatch) {

            // uploadToS3(`test${transportStreamIndex}.ts`,`./test${transportStreamIndex}.ts`)
            if ((divisorUploadNumber % 5 === 0) && !!divisorUploadNumber) {
                // console.error("Full Manifest");
            }

            const chunk = await uploadManifestChunk(writeNumber);
            uploadToS3(chunk.file_name,`./${chunk.file_name}`)
            // if (chunk.file_name !== undefined) {
                // console.log("Object Number ", writeNumber);
                const objectToSend = {
                    epochTime: moment().valueOf(),
                    manifestInformation: chunk,
                    // location: `race_output/test${writeNumber - 1}.ts`,
                    location: `radio_output/${chunk.file_name}`
                }
                transportStreamIndex += 1;
                writeNumber += 1;
                // console.log(objectToSend);
                await postToManifestGenerator(objectToSend);
                
                // uploadToS3(chunk.file_name);
            }
            // console.log(writeNumber);
            console.log("Match ",writeNumber);
            // writeNumber++;
            divisorUploadNumber++;


        // }
    });
}

run();