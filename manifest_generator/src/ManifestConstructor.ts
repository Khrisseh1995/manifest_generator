import fs from 'fs';
import AWS from 'aws-sdk';
import ManifestInformation from './types/ManifestInformation';
import ManifestMetadata from './types/ManifestMetadata';
import AdInformation from './types/AdInformation';
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

    constructManifest(
        manifestMetadata: ManifestMetadata,
        timestamps: Array<ManifestInformation>,
        prerollAd: AdInformation = {} as AdInformation
    ) {

        const manifestWriteStream = fs.createWriteStream('./src/master.m3u8');
        const manifestMetadataWriteStream = fs.writeFile('./src/metadataInfo.json', JSON.stringify(manifestMetadata), () => console.log("Success"));

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

            // if (Object.keys(prerollAd)?.length) {
            if (!(JSON.stringify(prerollAd) === '{}')) {
                const params = {
                    Bucket: 'hboremixbucket',
                    Key: prerollAd.LOCATION
                }

                const signedUrl = s3.getSignedUrl('getObject', params);
                console.log(signedUrl);
                const prerollAdArray = Object.values(prerollAd);
                manifestWriteStream.write("#EXT-X-DISCONTINUITY");
                prerollAdArray.forEach((prerollAd: string) => {
                    //Needed if media segment is not part of stream: https://developer.apple.com/documentation/http_live_streaming/example_playlists_for_http_live_streaming/incorporating_ads_into_a_playlist
                    manifestWriteStream.write(prerollAd);
                });
            }
            // console.log(metadataArray);

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

    readManifestMetadata() {
        let rawdata = fs.readFileSync('./src/metadataInfo.json')
        let metadataInfo = JSON.parse(rawdata.toString());
        return metadataInfo;
    }
}