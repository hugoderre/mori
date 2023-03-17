const OpenAIClient = require( './openai.js' )
const StreamlabsApiClient = require( './streamlabs.js' )
const TmiApiClient = require( './tmi.js' )

class App {
	constructor( expressApp ) {
		this.expressApp = expressApp
		this.openAIClient = new OpenAIClient( this.expressApp )
		this.openAIClient.listenCustomPrompt()
		this.tmi = new TmiApiClient( this.expressApp, this.openAIClient )
		this.tmi.startClient()
		this.streamlabs = new StreamlabsApiClient( this.openAIClient )
		this.streamlabs.runSocket()
	}
}

module.exports = App