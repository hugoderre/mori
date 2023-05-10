const io = require( 'socket.io-client' )
const dotenv = require( 'dotenv' )
dotenv.config()

class StreamlabsApiClient {
	constructor( OpenAIClient ) {
		this.OpenAIClient = OpenAIClient
		this.startListeners()
	}

	async startListeners() {
		const socket = io( `https://sockets.streamlabs.com?token=${process.env.STREAMLABS_SOCKET_TOKEN}`, {
			transports: [ 'websocket' ]
		} )

		socket.on( 'connect', () => {
			console.log( 'Connecté au serveur WebSocket Streamlabs' )
		} )

		socket.on( 'event', async ( eventData ) => {
			const type = eventData.type
			switch ( eventData.type ) {
				case 'follow':
					await this.OpenAIClient.queueUpPrompt(
						{
							type,
							messages: [
								{ "role": "user", "content": `Mori, the viewer "${eventData.message[ 0 ].name}" just followed your twitch channel! Welcome him in a concise way.` }
							],
							temperature: 1,
							username: ''
						},
						'low'
					)
					break
				case 'donation':
					await this.OpenAIClient.queueUpPrompt(
						{
							type,
							messages: [
								{ "role": "user", "content": `Mori, the viewer "${eventData.message[ 0 ].name}" just gave ${eventData.message[ 0 ].formatted_amount} to your Twitch channel! Thank him very warmly.` }
							],
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