const MessagesCollection = require( './mongo/messagesCollection.js' )
const OpenAIClient = require( './openai/client.js' )
const OpenAIExpressRoutes = require( './openai/expressRoutes.js' )
const TwitchEventSub = require( './twitch/eventSub.js' )
const StreamlabsApiClient = require( './twitch/streamlabs.js' )
const TmiApiClient = require( './twitch/tmi.js' )
const VtsPlugin = require( './vts.js' )
const SongRequest = require( './song-request/songRequest.js' )
const SLOBS = require( './slobs.js' )

class App {
	constructor( expressApp ) {
		this.expressApp = expressApp
	}

	async init() {
		const slobs = new SLOBS()

		const vtsPlugin = new VtsPlugin()
		await vtsPlugin.init()

		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const openAIClient = new OpenAIClient( this.expressApp, messagesCollection, vtsPlugin, slobs )
		openAIClient.initPromptQueue()

		const openAIExpressRoutes = new OpenAIExpressRoutes( this.expressApp, openAIClient, messagesCollection )

		const songRequest = new SongRequest( this.expressApp, openAIClient, vtsPlugin, slobs )

		const twitchEventSub = new TwitchEventSub( openAIClient, vtsPlugin, songRequest )

		const tmi = new TmiApiClient( this.expressApp, openAIClient, messagesCollection )

		const streamlabs = new StreamlabsApiClient( openAIClient )
	}

	async discordBotStandalone() {
		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const openAIClient = new OpenAIClient( this.expressApp, messagesCollection )

		const openAIExpressRoutes = new OpenAIExpressRoutes( this.expressApp, openAIClient, messagesCollection )
	}
}

module.exports = App