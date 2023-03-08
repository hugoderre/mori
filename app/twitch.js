import tmi from 'tmi.js'
import { CompletionLogger } from './logger.js';
import { OpenAIGateway } from './openaiGateway.js';

export class TwitchMessages {
    constructor() {
        this.openAIGateway = new OpenAIGateway()
        this.completionLogger = new CompletionLogger()
    }

    startClient() {
        const client = new tmi.Client( {
            channels: [ 'trinity' ],
            options: {
                skipMembership: false
            }
        } );

        client.connect();

        client.on( 'message', this.messageCallback.bind(this) );
    }

    async messageCallback( channel, tags, message, self ) {
        const username = tags[ 'display-name' ]
        const timestamp = tags[ 'tmi-sent-ts' ]
        const regex = new RegExp( /[A-Za-z0-9+-éèàùâûê%ç&*@)(\/\\=:?!'" ]/, 'gm' )
        const formattedMessage = message.match( regex ).join( '' )

        if(!this.isValidMessage(username, formattedMessage)) {
            return
        }

        console.log( formattedMessage )
        // const completion = await openAIGateway.getCompletion(`Le viewer "${username}" dit dans le tchat Twitch: "${prompt}" et Mori répond: `, username)
        // const completionText = completion.data.choices[0].text.match(regex).join('')
        // completionLogger.writeCompletion(prompt, completionText)
    }

    isValidMessage(username, message) {
        const usernameDenies = [ 'Moobot', 'WizeBot' ]

        if ( usernameDenies.some( ud => username.includes( ud ) ) ) {
            return
        }

        if ( message[ 0 ] == '@' ) {
            return
        }

        return true
    }
}










