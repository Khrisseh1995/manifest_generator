import { VASTClient, VastCreativeLinear } from 'vast-client'
import {spawn} from 'child_process';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    signatureVersion: 'v4'
});
const vastClient = new VASTClient();

interface AdInformtion {
    creativeId: number;
    adLocation: string;
}

const fetchVastXml = async () => {
    const response = await vastClient.get('https://pubads.g.doubleclick.net/gampad/ads?slotname=/124319096/external/ad_rule_samples&sz=640x480&ciu_szs=300x250&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&url=https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags&unviewed_position_start=1&output=xml_vast3&impl=s&env=vp&gdfp_req=1&ad_rule=0&vad_type=linear&vpos=preroll&pod=1&ppos=1&lip=true&min_ad_duration=0&max_ad_duration=30000&vrid=5776&video_doc_id=short_onecue&cmsid=496&kfa=0&tfcd=0')
    const { creatives } = response.ads[0];
    //Take the first index as we want to linear creative
    const linearCreative = creatives[0] as VastCreativeLinear;

    const {id, mediaFiles} = linearCreative;
    const {fileURL} = mediaFiles[0];

    console.log(id);
    console.log(fileURL);
    // console.log(linearCreative)
    // console.log(creatives);
    // console.log(response.ads[0].creatives);
}

const transcodeAd = () => {
    const ffmpegOutput = spawn('ffmpeg')
}

fetchVastXml();


