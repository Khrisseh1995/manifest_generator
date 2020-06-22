const express = require('express');
const bodyParser = require('body-parser');
const databaseService = require('./database');
const ManifestConstructor = require('./construct_manifest');
const readLastLines = require('read-last-lines');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const { v4: uuidv4 } = require('uuid');
const app = express();



app.use(cors())
app.use(cookieParser());
app.use(bodyParser.json());

app.get('/generate_standard_manifest.m3u8', async (req, res) => {
    res.setHeader('Content-type','application/x-mpegURL');
    return res.sendFile(__dirname + '/master.m3u8');
});

app.post('/create_manifest',async (req,res) => {
    console.log("Hai");
    const { epochTime,location,manifestInformation } = req.body;
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

        const timestampValues = await databaseService.readValuesForManifest();
        console.log(timestampValues);
        const strippedValues = timestampValues.map(timestamp => {
            const { ID,...manifestValues } = timestamp;;
            return manifestValues;
        });

        databaseService.insertIntoDatabase([epochTime,ext_info,location,file_name]);
        const manifestConstructor = new ManifestConstructor();
        await manifestConstructor.constructManifest(manifestMetadata,strippedValues);
        
    }

    res.send({ success: true });
});

app.listen(80,() => {
    console.log("Listening on port 80");
})