const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
});

class ManifestConstructor {
    constructManifest(manifestMetadata,timestamps,alternativeSave = false) {
        console.log("Manifest",process.env.AWS_ACCESS_ID);

        const manifestWriteStream = fs.createWriteStream('./src/master.m3u8');

        return new Promise((res,rej) => {
            timestamps = timestamps.map(timestamp => {
                const params = {
                    Bucket: 'hboremixbucket',
                    Key: timestamp.LOCATION
                }
                const signedUrl = s3.getSignedUrl('getObject',params);
                timestamp.location = signedUrl;
                return {
                    time: timestamp.TIME,
                    location: signedUrl
                };
            });


            const metadataArray = Array.from(Object.values(manifestMetadata));

            console.log(timestamps);
            console.log(metadataArray)
            metadataArray.forEach((metadata,index) => {
                manifestWriteStream.write(`${metadata}\n`);
            });


            timestamps.forEach(timestamp => {
                manifestWriteStream.write(`${timestamp.time}\n`);
                manifestWriteStream.write(`${timestamp.location}\n`);
            });            

            manifestWriteStream.end();

            manifestWriteStream.on('close',() => res("Success"));
        })
    }
}

module.exports = ManifestConstructor