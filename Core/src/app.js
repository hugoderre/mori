const MessagesCollection = require( './mongo/MessagesCollection.js' )
const LanguageModelClient = require( './ai/LanguageModelClient.js' )
const { ExpressRoutes: LanguageModelExpressRoutes } = require( './ai/ExpressRoutes.js' )
const { EventSub: TwitchEventSub } = require( './twitch/EventSub.js' )
const StreamlabsApiClient = require( './twitch/StreamlabsClient.js' )
const TmiClient = require( './twitch/TmiClient.js' )
const { Plugin: VtsPlugin } = require( './vts/Plugin.js' )
const SongRequest = require( './song-request/songRequest.js' )
const SlobsWebsocket = require( './streamlabs/SlobsWebsocket.js' )

class App {
	constructor( expressApp ) {
		this.expressApp = expressApp
	}

	async init() {
		const slobs = new SlobsWebsocket()

		const vtsPlugin = new VtsPlugin()
		await vtsPlugin.init()

		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const languageModelClient = new LanguageModelClient( this.expressApp, messagesCollection, vtsPlugin, slobs )
		languageModelClient.initPromptQueue()

		const languageModelExpressRoutes = new LanguageModelExpressRoutes( this.expressApp, languageModelClient, messagesCollection )

		const songRequest = new SongRequest( this.expressApp, languageModelClient, vtsPlugin, slobs )

		const twitchEventSub = new TwitchEventSub( languageModelClient, vtsPlugin, songRequest )

		const tmi = new TmiClient( this.expressApp, languageModelClient, messagesCollection )

		const streamlabs = new StreamlabsApiClient( languageModelClient )
	}

	async discordBotStandalone() {
		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const languageModelClient = new LanguageModelClient( this.expressApp, messagesCollection )

		const languageModelExpressRoutes = new LanguageModelExpressRoutes( this.expressApp, languageModelClient, messagesCollection )
	}
}

module.exports = App