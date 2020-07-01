export default interface ManifestMetadata {
    manifestDeclaration: string;
    manifestVersion: string;
    targetDuration: string;
    mediaSegment: string;
    //If FMP4 is used (which it probs should el-oh-el)
    mp4Initialization?: string;
}