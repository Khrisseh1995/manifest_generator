const axios = require('axios');
const parser = require('fast-xml-parser');
const fs = require('fs');
var he = require('he');
const options = {
    attributeNamePrefix: "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false, //"strict"
    attrValueProcessor: (val,attrName) => he.decode(val,{ isAttributeValue: true }),//default is a=>a
    tagValueProcessor: (val,tagName) => he.decode(val), //default is a=>a
    stopNodes: ["parse-me-as-string"]
};

const fetchVmapFiles = async () => {
    const { data: vmapEndpoint } = await axios.get("https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=")
    if (parser.validate(vmapEndpoint)) { //optional (it'll return an object in case it's not valid)
        const jsonObj = parser.parse(vmapEndpoint,options);
        //nested data structures are fkn rank
        const { __cdata: vmapUrl } = jsonObj['vmap:VMAP']['vmap:AdBreak']['vmap:AdSource']['vmap:AdTagURI'];

        const { data: adEndpoint } = await axios.get(vmapUrl);

        const vmapJsonObj = parser.parse(adEndpoint,options);
        const { __cdata: mediaUrl } = vmapJsonObj['VAST']['Ad']['InLine']['Creatives']['Creative'][0]['Linear']['MediaFiles']['MediaFile'][0];
        console.log("Ad URL: ",mediaUrl);
        const { data: adMedia } = await axios({
            method: 'get',
            url: mediaUrl,
            responseType: 'stream'
        });

        adMedia.pipe(fs.createWriteStream('ad.mp4'));
    }

}

fetchVmapFiles();