const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( './voicemaker.js' )
const CompletionLogger = require( './logger.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars } = require( './utils.js' )
const dotenv = require( 'dotenv' )
dotenv.config()

class OpenAIClient{
    constructor(expressApp) {
        this.expressApp = expressApp
        this.api = this.getApi()
        this.completionLogger = new CompletionLogger()
        this.voiceMakerAPI = new VoiceMakerAPI(this)
        this.promptQueue = []
        this.promptQueueIntervalRef = null
        this.isCompletionInProcess = false
        this.startPromptQueue()
    }

    getApi() {
        const configuration = new Configuration( {
            apiKey: process.env.OPENAI_API_KEY,
        } );
        return new OpenAIApi( configuration );
    }

    queueUpPrompt(prompt, priority) {
        this.promptQueue.push(
            {
                prompt,
                priority
            }
        )
    }

    startPromptQueue() {
        this.promptQueueIntervalRef = setInterval(async () => {
            // console.log(this.promptQueue)
            if(this.isCompletionInProcess || !this.promptQueue.length) {
                return
            }

            const promptData = this.promptQueue.pop()
            await this.runChatCompletion( promptData.prompt )
        }, 1000);
    }

    async runChatCompletion( prompt ) {
        this.isCompletionInProcess = true

        const completionObj = await this.api.createChatCompletion( {
            model: process.env.OPENAI_CHAT_MODEL,
            messages: [
                { "role": 'system', "content": "Tu t'appelles Mori, une IA et streameuse sur Twitch, tu réponds aux question sur le tchat. Ta personnalité reflète ce que pourrait être une fille mignonne et rigolote dans un manga shonen, mais tu aimes bien aussi être sarcastique, ironique ou avoir du second degrés parfois lorsqu'on te pose des questions. Tes passions sont les mangas, les jeux-vidéos, la peinture et faire des émission en direct sur Twitch" },
                { "role": 'user', "content": prompt.text }
            ],
            max_tokens: 15,
            temperature: prompt.temperature,
            user: prompt.username ? sha256(  prompt.username ) : ''
        } );

        const completion = escapeSpecialChars( completionObj.data.choices[ 0 ].message.content )
        this.completionLogger.writeCompletion( prompt, completion )
        this.voiceMakerAPI.sayInProcess( completion )

        return completion
    }

    listenCustomPrompt() {
        this.expressApp.post( '/custom-prompt', async ( req, res ) => {
            const text = req.body.text
            const temperature = req.body.temperature
            if(!text || !temperature) return
            await this.runChatCompletion(
                text,
                temperature
            )
            return res.send('Custom prompt done')
        } )
    }
}

module.exports = OpenAIClient