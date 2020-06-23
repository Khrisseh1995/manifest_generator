import { VASTClient, VastCreativeLinear } from 'vast-client'
import { spawn } from 'child_process';
import AWS from 'aws-sdk';
import fs from 'fs';
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
});
const vastClient = new VASTClient();

const transcodeAd = (creativeId: string, adUrl: string) => {
    return new Promise(async (res, rej) => {
        console.log("Hai");
        const ffmpegOutput = spawn('../ffmpeg/ffmpeg-bin/ffmpeg', [
            '-i',
            adUrl,            
            '-c',
            'copy',
            '-f',
            'mpegts',
            '../ads/ad.ts'
        ]);

        ffmpegOutput.stderr.on('data', data => console.log(data.toString()));        

        ffmpegOutput.stdout.on('close', async () => {
            const params = {
                Bucket: 'hboremixbucket',
                Key: `ads/${creativeId}.ts`,
                Body: fs.readFileSync('../ads/ad.ts')
            }
            
            const upload = await s3.upload(params).promise();
            console.log(upload);
            spawn('rm', ['../ads/ad.ts']);
            res();
        });        
    })
}

export default transcodeAd;



