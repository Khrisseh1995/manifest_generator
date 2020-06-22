import fs from 'fs';
import AWS from 'aws-sdk';
import ManifestInformation from './types/ManifestInformation';
import ManifestMetadata from './types/ManifestMetadata';
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
});

interface ManifestWriteValue {
    extInfo: string;
    location: string;
}

export default class ManifestConstructor {
    constructManifest(manifestMetadata: ManifestMetadata, timestamps: Array<ManifestInformation>) {
        console.log("Manifest", process.env.AWS_ACCESS_ID);

        const manifestWriteStream = fs.createWriteStream('./src/master.m3u8');

        return new Promise((res, rej) => {
            const manifestWriteValues: Array<ManifestWriteValue> = timestamps.map(timestamp => {
                const params = {
                    Bucket: 'hboremixbucket',
                    Key: timestamp.LOCATION
                }
                const signedUrl = s3.getSignedUrl('getObject', params);
                return {
                    extInfo: timestamp.EXTINFO,
                    location: signedUrl
                };
            });

            const metadataArray = Array.from(Object.values(manifestMetadata));

            console.log(timestamps);
            console.log(metadataArray);

            metadataArray.forEach((metadata, index) => {
                manifestWriteStream.write(`${metadata}\n`);
            });


            manifestWriteValues.forEach(timestamp => {
                manifestWriteStream.write(`${timestamp.extInfo}\n`);
                manifestWriteStream.write(`${timestamp.location}\n`);
            });

            manifestWriteStream.end();

            manifestWriteStream.on('close', () => res("Success"));
        })
    }
}