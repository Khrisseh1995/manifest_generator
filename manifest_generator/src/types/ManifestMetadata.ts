export default interface ManifestMetadata {
    manifestDeclaration: string;
    manifestVersion: string;
    targetDuration: string;
    mediaSegment: string;
    //For when FP4 is used
    mp4Initialization?: string;
}