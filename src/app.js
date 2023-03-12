const OpenAIClient = require( './openai.js' )
const StreamlabsApiClient = require( './streamlabs.js' )
const TmiApiClient = require( './tmi.js' )

class App {
    constructor(expressApp) {
        this.expressApp = expressApp
        this.OpenAIClient = new OpenAIClient(this.expressApp)
        this.OpenAIClient.listenCustomPrompt()
        this.tmi = new TmiApiClient( this.OpenAIClient )
        this.tmi.startClient()
        this.streamlabs = new StreamlabsApiClient( this.OpenAIClient )
        this.streamlabs.runSocket()
    }
}

module.exports = App