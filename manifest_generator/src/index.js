const express = require('express');
const bodyParser = require('body-parser');
const databaseService = require('./database');
const ManifestConstructor = require('./construct_manifest');
const readLastLines = require('read-last-lines');
const app = express();
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
app.use(cookieParser());
app.use(bodyParser.json());

app.get('/serve_manifest_cookies', async (req,res) => {
    const segmentInfoRegex = /#EXT-X-MEDIA-SEQUENCE:[0-9]+/gm    
    const regex = /test[0-9]+/gm; 
    const numberRegex = /[0-9]+/gm;
    const lines = await readLastLines.read(__dirname + '/master.m3u8', 20)
    const regexMatches = lines.match(regex);
    const sorted = regexMatches.sort();    
    const segmentInfoMatch = lines.match(segmentInfoRegex);
    const segmentTime = segmentInfoMatch[0].split(':')[1];
    const lastFile = sorted[2].match(numberRegex)[0];
    console.log(segmentTime);
    console.log(!!req.cookies.lastLine);
    if(!!req.cookies.lastLine === false) { 
        console.log("Called Without Cookie");
        res.cookie('lastLine', `${lastFile},${segmentTime}`);
        res.setHeader('Content-type','application/x-mpegURL');
        return res.sendFile(__dirname + '/master.m3u8');
        // res.sendFile(__dirname + '/alternative_master.m3u8');        
    }
    
    const cookiesArray = req.cookies.lastLine.split(",");
    console.log(cookiesArray);
    
    const lastLineNumber = cookiesArray[0];
    const segmentTimeCookie = cookiesArray[1];

    const manifestMetadata = {
        manifestDeclaration: "#EXTM3U",
        manifestVersion: "#EXT-X-VERSION:7",
        targetDuration: `#EXT-X-TARGETDURATION:9`,
        mediaSegment: `#EXT-X-MEDIA-SEQUENCE:${segmentTimeCookie}`
    }
    

    const lastThreeRows = await databaseService.getLastRecords(lastFile - 1, parseInt(lastFile) + 1);
    const strippedValues = lastThreeRows.map(timestamp => {
        const { ID,...manifestValues } = timestamp;;
        return manifestValues;
    });
    
    // console.log(manifestMetadata);
    // console.log(strippedValues);
    const manifestConstructor = new ManifestConstructor();
    const data = await manifestConstructor.constructManifest(manifestMetadata,strippedValues, true);
    // console.log(data);

    console.log("Called With Cookie");
    res.cookie('lastLine', `${lastFile},${segmentTime}`);
    res.setHeader('Content-type','application/x-mpegURL');
    return res.sendFile(__dirname + '/alternative_master.m3u8');
});

app.get('/generate_from_db', (req, res) => {
    
});

app.post('/create_manifest',async (req,res) => {
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
        const strippedValues = timestampValues.map(timestamp => {
            const { ID,...manifestValues } = timestamp;;
            return manifestValues;
        });

        databaseService.insertIntoDatabase([epochTime,ext_info,location,file_name]);
        const manifestConstructor = new ManifestConstructor();
        const data = await manifestConstructor.constructManifest(manifestMetadata,strippedValues);
        // console.log(data);
    }

    res.send({ success: true });
});

app.listen(80,() => {
    console.log("Listening on port 80");
})