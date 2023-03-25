const { PubSubClient } = require( '@twurple/pubsub' )
const { RefreshingAuthProvider } = require( '@twurple/auth' )
const fs = require( 'fs' ).promises
require( 'dotenv' ).config()

class TwitchEventSub {
	constructor( openAiClient, vtsPlugin ) {
		this.openAiClient = openAiClient
		this.vtsPlugin = vtsPlugin
		this.clientId = process.env.TWITCH_CLIENT_ID
		this.clientSecret = process.env.TWITCH_CLIENT_SECRET
		this.userId = process.env.TWITCH_USER_ID
		this.pubSubClient = this.getPubSubClient()
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
			switch ( data.rewardId ) {
				case process.env.REWARD_ID_DRINK:
					this.openAiClient.queueUpPrompt( {
						type: 'vtsItemTrigger',
						vtsHotkeyName: 'Drink',
						messages: [
							{ "role": 'user', "content": `Mori, le viewer "${data.userDisplayName}" vient de te donner une boisson pour te deshydrater. Remerçie le de façon sarcastique.` }
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
							{ "role": 'user', "content": `Mori, le viewer "${data.userDisplayName}" vient de te caresser la tête virtuellement. Remerçie le de façon amusée et sarcastique.` }
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
							{ "role": 'user', "content": `Mori, le viewer "${data.userDisplayName}" vient de te mettre des lunettes de soleil. Remerçie le de façon amusée et sarcastique.` }
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
							{ "role": 'user', "content": `Mori, le viewer "${data.userDisplayName}" vient de te mettre un coup de marteau virtuel. Réagis à ça de façon amusée et sarcastique.` }
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
				default:
					break
			}
		} )
	}
}

module.exports = TwitchEventSub