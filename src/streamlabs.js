const io = require( 'socket.io-client' )
const dotenv = require( 'dotenv' )
dotenv.config()

class StreamlabsApiClient {
	constructor( OpenAIClient ) {
		this.OpenAIClient = OpenAIClient
	}

	async runSocket() {
		const socket = io( `https://sockets.streamlabs.com?token=${process.env.STREAMLABS_SOCKET_TOKEN}`, {
			transports: [ 'websocket' ]
		} )

		socket.on( 'connect', () => {
			console.log( 'Connecté au serveur WebSocket Streamlabs' )
		} )

		socket.on( 'event', async ( eventData ) => {

			switch ( eventData.type ) {
				case 'follow':
					await this.OpenAIClient.queueUpPrompt(
						{
							text: `Mori, le viewer "${eventData.message[ 0 ].name}" vient de follow ta chaine twitch ! Souhaite lui la bienvenue de façon concise.`,
							temperature: 0.9,
							username: ''
						},
						'medium'
					)
					break
				case 'donation':
					await this.OpenAIClient.queueUpPrompt(
						{
							text: `Mori, le viewer "${eventData.message[ 0 ].name}" vient de donner ${eventData.message[ 0 ].formatted_amount} à ta chaine Twitch ! Remercie le très chaleureuse.`,
							temperature: 0.8,
							username: ''
						},
						'high'
					)
					break
				default:
					break
			}

		} )
		socket.connect()
	}
}

module.exports = StreamlabsApiClient