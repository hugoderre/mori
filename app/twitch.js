import tmi from 'tmi.js'
import { OpenAIGateway } from './openaiGateway.js';

const client = new tmi.Client({
	channels: [ 'patchook' ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
    const username = tags['display-name']
});

const openAIGateway = new OpenAIGateway()
const completion = await openAIGateway.getCompletion("Quel est ton plat préféré ?")
console.log(completion.data.choices)