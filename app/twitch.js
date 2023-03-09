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
            channels: [ 'patchook' ],
            options: {
                skipMembership: false
            }
        } );

        client.connect();

        client.on( 'message', this.messageCallback.bind( this ) );
    }

    async messageCallback( channel, tags, message, self ) {
        const username = tags[ 'display-name' ]
        const timestamp = tags[ 'tmi-sent-ts' ]
        const regex = new RegExp( /[A-Za-z0-9+-éèàùâûê%ç&*@ô)(\/\\=:?!'" ]/, 'gm' )
        const formattedMessage = message.match( regex ).join( '' )

        if ( !this.isValidMessage( username, formattedMessage ) ) {
            return
        }

        // const completion = await this.openAIGateway.getCompletion( `Le viewer "${ username }" dit dans le tchat Twitch: "${ formattedMessage }" et Mori répond: `, username )
        const completion = await this.openAIGateway.getChatCompletion( formattedMessage, username )
        const completionTextMatches = completion.data.choices[ 0 ].message.content.match( regex )
        if ( !completionTextMatches || completionTextMatches.length === 0 ) {
            return
        }

        const completionText = completionTextMatches.join( '' )
        this.completionLogger.writeCompletion( formattedMessage, completionText )
    }

    isValidMessage( username, message ) {
        if ( message.length > 100 ) {
            return
        }

        const usernameDenies = [ 'Moobot', 'WizeBot' ]

        if ( usernameDenies.some( u => username.includes( u ) ) ) {
            return
        }

        const firstCharDenies = [ '@', '!', '/' ]
        if ( firstCharDenies.some( c => message[ 0 ].includes( c ) ) ) {
            return
        }

        return true
    }
}










