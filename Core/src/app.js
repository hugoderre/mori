const PromptQueue = require( './PromptQueue.js' )
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
		const promptQueue = new PromptQueue()

		const slobs = new SlobsWebsocket()

		const vtsPlugin = new VtsPlugin()
		await vtsPlugin.init()

		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const languageModelClient = new LanguageModelClient( this.expressApp, messagesCollection, vtsPlugin, slobs, promptQueue )

		const languageModelExpressRoutes = new LanguageModelExpressRoutes( this.expressApp, languageModelClient, messagesCollection, promptQueue )

		const songRequest = new SongRequest( this.expressApp, vtsPlugin, slobs, promptQueue )

		const twitchEventSub = new TwitchEventSub( languageModelClient, vtsPlugin, songRequest, promptQueue )

		const tmi = new TmiClient( this.expressApp, messagesCollection, promptQueue )

		const streamlabs = new StreamlabsApiClient( promptQueue )

		promptQueue.dispatch( {
			llm: languageModelClient,
			sr: songRequest
		} )
	}

	async discordBotStandalone() {
		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const languageModelClient = new LanguageModelClient( this.expressApp, messagesCollection )

		const languageModelExpressRoutes = new LanguageModelExpressRoutes( this.expressApp, languageModelClient, messagesCollection )
	}
}

module.exports = App