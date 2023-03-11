import { OpenAIApiClient } from "./openai.js"
import { StreamlabsApiClient } from "./streamlabs.js"
import { TmiApiClient } from "./tmi.js"

export default class App {
    constructor() {
        this.openAIApiClient = new OpenAIApiClient()
        this.tmi = new TmiApiClient(this.openAIApiClient)
        this.tmi.startClient()
        this.streamlabs = new StreamlabsApiClient(this.openAIApiClient)
        this.streamlabs.runSocket()
    }
}