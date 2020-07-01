const VodHandler = require('./VodHandler');

const vodHandler = new VodHandler(process.env.VOD_STREAM_ENDPOINT);
const run = async () => {
    await vodHandler.run();
}
run();