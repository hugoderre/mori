import dotenv from 'dotenv'
dotenv.config()

export class StreamlabsApiClient {
    constructor( openAIApiClient ) {
        this.openAIApiClient = openAIApiClient
    }

    async runSocket() {
        const socket = io( `https://sockets.streamlabs.com?token=${process.env.STREAMLABS_SOCKET_TOKEN}`, {
            transports: [ 'websocket' ]
        } )
        
        socket.on( 'connect', () => {
            console.log( 'Connecté au serveur WebSocket Streamlabs' );
        } );

        socket.on( 'event', ( eventData ) => {
            console.log( 'Notification reçue :', eventData );

            if ( !eventData.for && eventData.type === 'donation' ) {
                console.log( 'Une donation a été effectuée !' );
                console.log( 'Montant :', eventData.message[ 0 ].amount );
                console.log( 'Nom de l\'utilisateur :', eventData.message[ 0 ].from );
            }
            if ( eventData.for === 'twitch_account' ) {
                switch ( eventData.type ) {
                    case 'follow':
                        //code to handle follow events
                        console.log( eventData.message );
                        break;
                    // case 'subscription':
                    //     //code to handle subscription events
                    //     console.log( eventData.message );
                    //     break;
                    default:
                        //default case
                        console.log( eventData.message );
                }
            }
        } );
        socket.connect();
    }
}