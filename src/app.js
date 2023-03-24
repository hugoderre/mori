const MessagesCollection = require( './mongo/messagesCollection.js' )
const OpenAIClient = require( './openai.js' )
const TwitchEventSub = require( './twitch/eventSub.js' )
const StreamlabsApiClient = require( './twitch/streamlabs.js' )
const TmiApiClient = require( './twitch/tmi.js' )
const VtsPlugin = require( './vts.js' )

class App {
	constructor( expressApp ) {
		this.expressApp = expressApp
	}

	async init() {
		const vtsPlugin = new VtsPlugin()
		await vtsPlugin.init()

		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const openAIClient = new OpenAIClient( this.expressApp, messagesCollection, vtsPlugin )
		openAIClient.listenCustomPrompt()
		openAIClient.listenTestPrompt()

		const twitchEventSub = new TwitchEventSub( openAIClient )
		twitchEventSub.startListeners()

		const tmi = new TmiApiClient( this.expressApp, openAIClient, messagesCollection )
		tmi.startListeners()

		const streamlabs = new StreamlabsApiClient( openAIClient )
		streamlabs.startListeners()


	}
}

module.exports = App