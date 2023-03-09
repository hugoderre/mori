import { Configuration, OpenAIApi } from "openai";
import { sha256 } from "js-sha256";
import dotenv from 'dotenv'
dotenv.config()

export class OpenAIGateway {
    constructor() {
        this.api = this.getApi()
    }

    getApi() {
        const configuration = new Configuration( {
            apiKey: process.env.OPENAI_API_KEY,
        } );
        return new OpenAIApi( configuration );
    }

    async getCompletion( prompt, username = '' ) {
        const response = await this.api.createCompletion( {
            model: process.env.OPENAI_FINE_TUNED_MODEL,
            prompt,
            max_tokens: 80,
            temperature: 0,
            // top_p: 1,
            // n: 1,
            // stream: false,
            // logprobs: null,
            user: username ? sha256( username ) : '',
            stop: "\n"
        } );
        return response;
    }

    async getChatCompletion( prompt, username ) {
        const response = await this.api.createChatCompletion( {
            model: process.env.OPENAI_CHAT_MODEL,
            messages: [
                { "role": 'system', "content": "Tu t'appelles Mori, une IA et streameuse sur Twitch, tu adores répondre aux question sur le tchat. Ta personnalité reflète ce que pourrait être une fille mignonne et innocente dans un manga shonen, mais tu aimes bien aussi être sarcastique, ironique ou avoir du second degrés parfois lorsqu'on te pose des questions. Tes passions sont les mangas, les jeux-vidéos, la peinture et bien sur faire des émission en direct sur Twitch" },
                { "role": 'user', "content": `Réponds de façon courte comme Mori (streameuse Twitch) répondrait ou réagirait au viewer "${username}" qui écrit cela dans le tchat: "${prompt}"` }
            ],
            max_tokens: 80,
            temperature: 0.7,
            // top_p: 1,
            // n: 1,
            // stream: false,
            // logprobs: null,
            user: username ? sha256( username ) : ''
        } );
        return response;
    }
}