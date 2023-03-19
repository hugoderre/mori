const MessagesCollection = require( './mongo/messagesCollection.js' )
const OpenAIClient = require( './openai.js' )
const StreamlabsApiClient = require( './streamlabs.js' )
const TmiApiClient = require( './tmi.js' )

class App {
	constructor( expressApp ) {
		this.expressApp = expressApp
		this.messagesCollection = new MessagesCollection()
		this.messagesCollection.initClient()
		this.openAIClient = new OpenAIClient( this.expressApp, this.messagesCollection )
		this.openAIClient.listenCustomPrompt()
		this.openAIClient.listenTestPrompt()
		this.tmi = new TmiApiClient( this.expressApp, this.openAIClient, this.messagesCollection )
		this.tmi.startClient()
		this.streamlabs = new StreamlabsApiClient( this.openAIClient )
		this.streamlabs.runSocket()
	}
}

module.exports = App