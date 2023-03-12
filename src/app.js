const OpenAIApiClient = require( './openai.js' )
const StreamlabsApiClient = require( './streamlabs.js' )
const TmiApiClient = require( './tmi.js' )

class App {
    constructor(expressApp) {
        this.expressApp = expressApp
        this.openAIApiClient = new OpenAIApiClient()
        this.openAIApiClient.listenCustomPrompt(this.expressApp)
        this.tmi = new TmiApiClient( this.openAIApiClient )
        this.tmi.startClient()
        this.streamlabs = new StreamlabsApiClient( this.openAIApiClient )
        this.streamlabs.runSocket()
    }
}

module.exports = App