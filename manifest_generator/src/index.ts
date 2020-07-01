import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { s3 } from './AWS';
import querystring from 'querystring';
//@ts-ignore
import ManifestConstructor from './ManifestConstructor';
import cors from 'cors'
import fetchVastXml from './VmapRequestHandler';
import cookieParser from 'cookie-parser';
import DatabaseHandler from './DatabaseHandler';

const app = express();

app.use(cors({
    credentials: true,
}))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())
app.use(bodyParser.json());

app.get('/generate_standard_manifest', async (req, res) => {
    // console.log(req.cookies);

    // if (!req.cookies?.cookieName) {

    //     // res.cookie('cookieName', 'cookieValue', {httpOnly: true, domain: "127.0.0.1"}) 
    //     res.cookie('cookieName', 'value', {httpOnly: false, secure: false});
    //     // res.cookie.Domain = null;
    //     console.log("It Doesn't Exist");
    // }

    //Solution as cookies are fucky on chrome/firefox localhost, use cookies when deployed on EC@
    res.setHeader('Content-type', 'application/x-mpegURL');
    const { adShown } = req.query;

    const manifestConstructor = new ManifestConstructor();
    // const manifestInformation = 
    const manifestMetadata = manifestConstructor.readManifestMetadata();
    manifestMetadata.manifestVersion = "#EXT-X-VERSION:4"
    
    const metaDataArray = Object.values(manifestMetadata);
    // metaDataArray.push("#EXT-X-DISCONTINUITY-SEQUENCE:0");
    // metaDataArray.push("#EXT-X-DISCONTINUITY");
    metaDataArray.splice(3, 0, "#EXT-X-INDEPENDENT-SEGMENTS");

    metaDataArray.push("#EXT-X-START:TIME-OFFSET=0");
    // metaDataArray.forEach(metaData => console.log(metaData))
    const database = DatabaseHandler.getInstance();
    const timestampValues = await database.readValuesForManifest();
    // console.log(timestampValues);
    const strippedValues = timestampValues.map(timestamp => {
        const { ID, TIME, FILENAME, ...manifestValues } = timestamp;
        const params = {
            Bucket: 'hboremixbucket',
            Key: manifestValues.LOCATION
        }
        const signedUrl = s3.getSignedUrl('getObject', params);
        manifestValues.LOCATION = signedUrl;
        // manifestValues.LOCATION = 
        // manifestValues = manifestValues.map(x => {

        // return x;
        // });
        return manifestValues;
    });

    const prerollAd = await fetchVastXml();
    // console.log(prerollAd);

    const params = {
        Bucket: 'hboremixbucket',
        Key: prerollAd!.LOCATION
    }

    const signedUrl = s3.getSignedUrl('getObject', params);
    console.log(signedUrl);
    const prerollAdArray = Object.values(prerollAd!);
    const adArray = [
        "#EXT-X-DISCONTINUITY",
        "#EXTINF:10.000000,",
        signedUrl,
        "#EXT-X-DISCONTINUITY"
        
    ];

    // prerollAdArray.unshift("#EXT-X-DISCONTINUITY");

    // // manifestWriteStream.write("#EXT-X-DISCONTINUITY");
    // prerollAdArray.forEach((prerollAd: string) => {
    //     //Needed if media segment is not part of stream: https://developer.apple.com/documentation/http_live_streaming/example_playlists_for_http_live_streaming/incorporating_ads_into_a_playlist
    //     console.log(prerollAd);
    // });

    // adArray.forEach(x => console.log(x));  

    const manifestMediaArray: Array<string> = [];
    

    strippedValues.forEach(timestampObject => {
        Object.values(timestampObject).forEach(timestamp => {
            manifestMediaArray.push(timestamp);
            // console.log(timestamp);
        })
    });

    // console.log(manifestMediaArray);

    let manifestToReturn = '';

    // const combinedAdArray = [...metaDataArray, ...adArray, ...manifestMediaArray];
    const combinedAdArray = [...metaDataArray, ...manifestMediaArray];
    // if (!adShown) {
        combinedAdArray.forEach((manifest, index) => {
            if (index === combinedAdArray.length - 1) {
                manifestToReturn += manifest;
            }
            else {
                manifestToReturn += `${manifest}\n`
            }

        });
    // }
    // else {
    //     combinedArray.forEach((manifest, index) => {
    //         // if (index === combinedArray.length - 1) {
    //             manifestToReturn += manifest;
    //         // }
    //         // else {
    //             manifestToReturn += `${manifest}\n`
    //         // }

    //     });
    // }

    res.send(manifestToReturn);
    // console.log(manifestToReturn);
    // console.log(combinedArray);


    console.log("Show the Ad!");

    // const adInformation = database.checkCreativeIdExists("57861016576");
    // console.log(adInformation);
    // res.send(combinedAdArray);
    // await manifestConstructor.constructManifest(manifestMetadata, strippedValues, );

    // }

    // if (!adShown) {

    // }

    // return res.send(combinedArray);


    // console.log(req.query.adShown);
    // req.headers['someHeader'] = 'someValue'
    // res.setHeader('Content-type', 'application/x-mpegURL');
    // console.log("Return!");

});

app.post('/create_manifest', async (req, res) => {
    const { epochTime, location, manifestInformation } = req.body;
    const {
        file_name,
        ext_info,
        manifest_declaration,
        manifest_version,
        target_duration,
        media_segment
    } = manifestInformation;
    if (!!file_name) {

        const manifestMetadata = {
            manifestDeclaration: manifest_declaration,
            manifestVersion: manifest_version,
            targetDuration: target_duration,
            mediaSegment: media_segment
        }
        const databaseService = DatabaseHandler.getInstance();

        const timestampValues = await databaseService.readValuesForManifest();
        // console.log(timestampValues);
        const strippedValues = timestampValues.map(timestamp => {
            const { ID, ...manifestValues } = timestamp;
            return manifestValues;
        });

        fs.writeFile('./manifest_metadata', JSON.stringify(manifestMetadata), () => console.log("Success"));

        databaseService.insertIntoDatabase([ext_info, epochTime, location, file_name]);
        const manifestConstructor = new ManifestConstructor();
        await manifestConstructor.constructManifest(manifestMetadata, strippedValues);

    }

    res.send({ success: true });
});

app.listen(80, () => {
    console.log("Listening on port 80");
})