const { PubSubClient } = require( '@twurple/pubsub' )
const { RefreshingAuthProvider } = require( '@twurple/auth' )
const fs = require( 'fs' ).promises
require( 'dotenv' ).config()

class TwitchEventSub {
	constructor() {
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

	async onRedemption( callback ) {
		( await this.pubSubClient ).onRedemption( this.userId, ( data ) => {
			callback( data )
		} )
	}
}

module.exports = TwitchEventSub