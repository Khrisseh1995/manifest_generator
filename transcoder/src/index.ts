import Transcoder from './transcoder';
import handler from './handler';
const transcoder = new Transcoder(process.env.STREAM_ENDPOINT!);

transcoder.startTranscode();

handler.listen(80, () => console.log("Listening on port 80"));