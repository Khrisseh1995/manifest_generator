
//Utility method to parse metadata from manifest files
const fetchValueFromManifestMetadata = (metadata, matchValue) => {
    
    const value = metadata.split(',')
        .filter(tag => !!tag.match(matchValue))[0]
        .split('=')[1].replace(/"/gm,"");

        return value;
}

module.exports = {
    fetchValueFromManifestMetadata
}