import { VASTClient, VastCreativeLinear } from 'vast-client'
import { spawn } from 'child_process';
import axios from 'axios';
import AWS from 'aws-sdk';
import fs from 'fs';
import DatabaseHandler from './DatabaseHandler';
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
});
const vastClient = new VASTClient();

interface AdInformtion {
    creativeId: string;
    adLocation: string;
}

const fetchVastXml = async () => {
    const response = await vastClient.get('https://pubads.g.doubleclick.net/gampad/ads?slotname=/124319096/external/ad_rule_samples&sz=640x480&ciu_szs=300x250&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&url=https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags&unviewed_position_start=1&output=xml_vast3&impl=s&env=vp&gdfp_req=1&ad_rule=0&vad_type=linear&vpos=preroll&pod=1&ppos=1&lip=true&min_ad_duration=0&max_ad_duration=30000&vrid=5776&video_doc_id=short_onecue&cmsid=496&kfa=0&tfcd=0')
    const { creatives } = response.ads[0];
    const linearCreative = creatives[0] as VastCreativeLinear;
    const { id: creativeId, mediaFiles } = linearCreative;
    const { fileURL } = mediaFiles[0];
    const dbhandler = DatabaseHandler.getInstance();
    const creativeIds = await dbhandler.checkCreativeIdExists(creativeId);
    
    //THANK YA THANK YA VERY MUCH
    if(creativeIds?.length) {
        return creativeIds;
    }

    const adInformation = {
        CREATIVE_ID: creativeId!,
        LOCATION: `ads/${creativeId}.ts`
    }

    dbhandler.insertIntoAdInformation(adInformation)
    console.log("Hai");

    axios.post("http://vmap/transcode_ad", {
        creativeId,
        fileURL
    })
    .then(data => console.log(data));
    
    return [];
}

fetchVastXml();