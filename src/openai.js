const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( './voicemaker.js' )
const CompletionLogger = require( './logger.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars } = require( './utils.js' )
const dotenv = require( 'dotenv' )
dotenv.config()

class OpenAIApiClient {
    constructor() {
        this.api = this.getApi()
        this.completionLogger = new CompletionLogger()
        this.voiceMakerAPI = new VoiceMakerAPI()
    }

    getApi() {
        const configuration = new Configuration( {
            apiKey: process.env.OPENAI_API_KEY,
        } );
        return new OpenAIApi( configuration );
    }

    async getChatCompletion( prompt, username = '' ) {
        const completionObj = await this.api.createChatCompletion( {
            model: process.env.OPENAI_CHAT_MODEL,
            messages: [
                { "role": 'system', "content": "Tu t'appelles Mori, une IA et streameuse sur Twitch, tu réponds aux question sur le tchat. Ta personnalité reflète ce que pourrait être une fille mignonne et rigolote dans un manga shonen, mais tu aimes bien aussi être sarcastique, ironique ou avoir du second degrés parfois lorsqu'on te pose des questions. Tes passions sont les mangas, les jeux-vidéos, la peinture et faire des émission en direct sur Twitch" },
                { "role": 'user', "content": prompt }
            ],
            max_tokens: 80,
            temperature: 0.7,
            user: username ? sha256( username ) : ''
        } );

        const completion = escapeSpecialChars( completionObj.data.choices[ 0 ].message.content )
        this.completionLogger.writeCompletion( prompt, completion )
        this.voiceMakerAPI.sayInProcess( completion )

        return completion
    }
}

module.exports = OpenAIApiClient