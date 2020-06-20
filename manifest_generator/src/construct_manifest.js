const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,    
    secretAccessKey: process.env.AWS_SECRET_KEY,    
    signatureVersion: 'v4'
});

class ManifestConstructor {
    constructManifest(manifestMetadata,timestamps, alternativeSave = false) {
        console.log("Manifest", process.env.AWS_ACCESS_ID);
        let manifestWriteStream = ''
        if(alternativeSave) {
            manifestWriteStream = fs.createWriteStream('./src/alternative_master.m3u8');
        }
        else {
            manifestWriteStream = fs.createWriteStream('./src/master.m3u8'); 
        }
        
        const params = {
            Bucket: 'hboremixbucket',
            Key: "radio_output/init.mp4"
        }

        
        const signedUrl = s3.getSignedUrl('getObject',params);
        manifestMetadata['mp4InitLocation'] = `#EXT-X-MAP:URI="${signedUrl}"`;
        const splitString = manifestMetadata.targetDuration.split(':');
        const updatedData = `${splitString[0]}:${splitString[1] - 1}`
        
        // const splitString = manifestMetadata.mediaSegment.split(':');
        
        // const splitStringTwo = manifestMetadata.manifestVersion.split(':');
        // const updatedDataVersion = `${splitStringTwo[0]}:4`;

        // manifestMetadata['mediaSegment'] = updatedData;
        // manifestMetadata['manifestVersion'] = updatedDataVersion;

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
            
            // console.log(timestamps);
            // console.log(metadataArray)
            metadataArray.forEach((metadata,index) => {
                manifestWriteStream.write(`${metadata}\n`);
            });
            

            timestamps.forEach(timestamp => {
                manifestWriteStream.write(`${timestamp.time}\n`);
                manifestWriteStream.write(`${timestamp.location}\n`);
            });

            // console.log("Ran construct");

            manifestWriteStream.end();

            manifestWriteStream.on('close', () => res("Success"));
        })
    }
}

module.exports = ManifestConstructor