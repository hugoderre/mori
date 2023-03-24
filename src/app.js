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
		const twitchEventSub = new TwitchEventSub()

		const vtsPlugin = new VtsPlugin( twitchEventSub )
		await vtsPlugin.init()

		const messagesCollection = new MessagesCollection()
		await messagesCollection.initClient()

		const openAIClient = new OpenAIClient( this.expressApp, messagesCollection )
		openAIClient.listenCustomPrompt()
		openAIClient.listenTestPrompt()

		const tmi = new TmiApiClient( this.expressApp, openAIClient, messagesCollection )
		tmi.startClient()

		const streamlabs = new StreamlabsApiClient( openAIClient )
		streamlabs.runSocket()
	}
}

module.exports = App