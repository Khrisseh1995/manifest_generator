import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import databaseService from './DatabaseHandler';
//@ts-ignore
import ManifestConstructor from './ManifestConstructor';
import cors from 'cors'
import fetchVastXml from './VmapRequestHandler';
import cookieParser from 'cookie-parser';
import DatabaseHandler from './DatabaseHandler';

const app = express();
app.use(cors())
app.use(cookieParser())
app.use(bodyParser.json());

app.get('/generate_standard_manifest', async (req, res) => {
    // console.log(req.cookies);
    // if (!req.cookies?.cookieName) {
    //     await fetchVastXml();
    //     res.cookie('cookieName', 'cookieValue', {httpOnly: true}) 
    //     console.log("It Doesn't Exist");
    // }
    res.setHeader('Content-type', 'application/x-mpegURL');
    console.log("Return!");
    return res.sendFile(__dirname + '/master.m3u8');
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