const { PubSubClient } = require( '@twurple/pubsub' )
const { RefreshingAuthProvider } = require( '@twurple/auth' )
const fs = require( 'fs' ).promises
require( 'dotenv' ).config()

class EventSub {
	constructor( openAiClient, vtsPlugin, songRequest ) {
		this.openAiClient = openAiClient
		this.vtsPlugin = vtsPlugin
		this.songRequest = songRequest
		this.clientId = process.env.TWITCH_CLIENT_ID
		this.clientSecret = process.env.TWITCH_CLIENT_SECRET
		this.userId = process.env.TWITCH_USER_ID
		this.pubSubClient = this.getPubSubClient()
		this.startListeners()
	}

	async getPubSubClient() {
		const tokenData = JSON.parse( await fs.readFile( `./data/twitch-tokens/tokens.${this.userId}.json`, 'UTF-8' ) );

		const authProvider = new RefreshingAuthProvider(
			{
				clientId: this.clientId,
				clientSecret: this.clientSecret,
				onRefresh: async ( userId, newTokenData ) => await fs.writeFile( `./data/twitch-tokens/tokens.${userId}.json`, JSON.stringify( newTokenData, null, 4 ), 'UTF-8' )
			}
		);

		await authProvider.addUserForToken( tokenData );

		return new PubSubClient( { authProvider } );
	}

	startListeners() {
		this.queueUpOnRedemption()
	}

	async queueUpOnRedemption() {
		( await this.pubSubClient ).onRedemption( this.userId, ( data ) => {
			const username = data.userDisplayName == 'Mori_IA' ? 'Creator' : data.userDisplayName
			switch ( data.rewardId ) {
				case process.env.REWARD_ID_DRINK:
					this.openAiClient.queueUpPrompt( {
						type: 'vtsItemTrigger',
						vtsHotkeyName: 'Drink',
						messages: [
							{ "role": 'user', "content": `Mori, the viewer "${username}" just gave you a drink to hydrate you. Thank him sarcastically.` }
						],
						temperature: 0.9
					},
						'high'
					)
					break
				case process.env.REWARD_ID_PET:
					this.openAiClient.queueUpPrompt( {
						type: 'vtsItemTrigger',
						vtsHotkeyName: 'Pet the Mori',
						messages: [
							{ "role": 'user', "content": `Mori, the viewer "${username}" just patted your head virtually. Thank him in an amused and sarcastic way.` }
						],
						temperature: 0.9
					},
						'high'
					)
					break
				case process.env.REWARD_ID_SUNGLASSES:
					this.openAiClient.queueUpPrompt( {
						type: 'vtsItemTrigger',
						vtsHotkeyName: 'Sunglasses',
						messages: [
							{ "role": 'user', "content": `Mori, the "${username}" viewer just put sunglasses on you. Thank him in an amused and sarcastic way.` }
						],
						temperature: 0.9
					},
						'high'
					)
					break
				case process.env.REWARD_ID_HAMMER:
					this.openAiClient.queueUpPrompt( {
						type: 'vtsItemTrigger',
						vtsHotkeyName: 'Hammer',
						messages: [
							{ "role": 'user', "content": `Mori, the "${username}" viewer just hit you with a virtual hammer. React to this in an amused and sarcastic way.` }
						],
						temperature: 0.9
					},
						'high'
					)
					break
				case process.env.REWARD_ID_BG_SQUARES:
					this.vtsPlugin.triggerHotkey( 'BackgroundSquares' )
					break
				case process.env.REWARD_ID_BG_FRUITS:
					this.vtsPlugin.triggerHotkey( 'BackgroundFruits' )
					break
				case process.env.REWARD_ID_BG_SHIBAS:
					this.vtsPlugin.triggerHotkey( 'BackgroundShibas' )
					break
				case process.env.REWARD_ID_BG_PARK:
					this.vtsPlugin.triggerHotkey( 'BackgroundPark' )
					break
				case process.env.REWARD_ID_BG_PUDDING:
					this.vtsPlugin.triggerHotkey( 'BackgroundPudding' )
					break
				case process.env.REWARD_ID_BG_DOKI:
					this.vtsPlugin.triggerHotkey( 'BackgroundDoki' )
					break
				case process.env.REWARD_ID_BG_BEDROOM:
					this.vtsPlugin.triggerHotkey( 'BackgroundBedroom' )
					break
				case process.env.REWARD_ID_SONG_REQUEST:
					this.openAiClient.queueUpPrompt( {
						type: 'chat_message',
						messages: [
							{ "role": 'user', "content": `Mori, the viewer "${username}" has just made a song request for the youtube music "${data.message}". Tell him you are learning the music right now and will play it in 2 minutes!` }
						],
						temperature: 0.9
					},
						'high'
					)
					this.songRequest.queueUpSongRequest( data.message )
					break
				case process.env.REWARD_ID_PAINT_REQUEST:
					this.openAiClient.queueUpPrompt( {
						type: 'chat_message',
						messages: [
							{ "role": 'user', "content": `Mori, the viewer "${username}" has just made a painting request with the theme "${data.message}". Tell him briefly that you are drawing and that will be displayed on the screen if it looks good!` }
						],
						temperature: 0.9,
						callback: () => {
							this.openAiClient.runImageCompletion( data.message )
						}
					},
						'high'
					)
					break
				default:
					break
			}
		} )
	}
}

module.exports = { EventSub }