const io = require( 'socket.io-client' )
const dotenv = require( 'dotenv' )
dotenv.config()

class StreamlabsApiClient {
    constructor( openAIApiClient ) {
        this.openAIApiClient = openAIApiClient
    }

    async runSocket() {
        const socket = io( `https://sockets.streamlabs.com?token=${ process.env.STREAMLABS_SOCKET_TOKEN }`, {
            transports: [ 'websocket' ]
        } )

        socket.on( 'connect', () => {
            console.log( 'Connecté au serveur WebSocket Streamlabs' )
        } )

        socket.on( 'event', ( eventData ) => {

            switch ( eventData.type ) {
                case 'follow':
                    //code to handle follow events
                    this.openAIApiClient.runChatCompletion(
                        `Mori, le viewer "${eventData.message[0].name}" vient de follow ta chaine twitch ! Souhaite lui la bienvenue de façon concise.`,
                        0.9,
                        ''
                    )
                    break
                case 'donation': 
                    this.openAIApiClient.runChatCompletion(
                        `Mori, le viewer "${eventData.message[0].name}" vient de donner ${eventData.message[0].formatted_amount} à ta chaine Twitch ! Remercie le très chaleureuse.`,
                        0.8
                    )
                    break
                default:
                    console.log( eventData.message )
                    break
            }

        } )
        socket.connect()
    }
}

module.exports = StreamlabsApiClient