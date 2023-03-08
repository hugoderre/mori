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
            user: username ? sha256(username) : '',
            stop: "\n"
        } );
        return response;
    }
}