const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( './voicemaker.js' )
const CompletionLogger = require( './logger.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars } = require( './utils.js' )
const dotenv = require( 'dotenv' )
dotenv.config()

class OpenAIClient {
	constructor( expressApp ) {
		this.expressApp = expressApp
		this.api = this.getApi()
		this.completionLogger = new CompletionLogger()
		this.voiceMakerAPI = new VoiceMakerAPI( this )
		this.promptQueue = {
			low: [],
			medium: [],
			high: []
		}
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

	queueUpPrompt( prompt, priority ) {
		console.log( prompt, priority )
		this.promptQueue[ priority ].push( prompt )
	}

	startPromptQueue() {
		this.promptQueueIntervalRef = setInterval( async () => {
			if ( this.isCompletionInProcess ) {
				return
			}
			const priorities = [ 'high', 'medium', 'low' ]
			for ( const priority of priorities ) {
				if ( !this.promptQueue[ priority ][ 0 ] ) {
					continue
				}
				await this.runChatCompletion( this.promptQueue[ priority ].pop() )
				break
			}
		}, 1000 );
	}

	async runChatCompletion( prompt ) {
		this.isCompletionInProcess = true
		const completionObj = await this.api.createChatCompletion( {
			model: process.env.OPENAI_CHAT_MODEL,
			messages: [
				{ "role": 'system', "content": "Tu t'appelles Mori, une IA et streameuse sur Twitch, tu réponds aux question sur le tchat. Ta personnalité reflète ce que pourrait être une fille mignonne et rigolote dans un manga shonen, mais tu aimes bien aussi être sarcastique, ironique ou avoir du second degrés parfois lorsqu'on te pose des questions. Tes passions sont les mangas, les jeux-vidéos, la peinture et faire des émission en direct sur Twitch. N'utilise pas de smiley." },
				{ "role": 'user', "content": prompt.text }
			],
			max_tokens: prompt.max_tokens ?? 120,
			temperature: prompt.temperature,
			user: prompt.username ? sha256( prompt.username ) : ''
		} );

		let completion = escapeSpecialChars( completionObj.data.choices[ 0 ].message.content )
		completion = this.completionPostFormatting( completion )
		this.completionLogger.writeCompletion( prompt, completion )
		this.voiceMakerAPI.runTTS( completion )

		return completion
	}

	completionPostFormatting( completion ) {
		let fCompletion = completion.replace( 'Mori:', '' )
			.replace( 'Mori :', '' )
		return fCompletion
	}

	listenCustomPrompt() {
		this.expressApp.post( '/custom-prompt', async ( req, res ) => {
			if ( !req.body.text ) {
				return res.send( 'Wrong body format' )
			}

			this.queueUpPrompt(
				{
					text: `Mori, en respectant les règles de Twitch, réponds de façon courte, sans emoticone et si le message du viewer est une question, commence ta phrase en reprenant sa question et répond parfois avec sarcasme ou second dégrés à un viewer qui écrit cela dans le tchat: "${req.body.text}"`,
					temperature: req.body.temperature ?? 0.8,
					max_tokens: req.body.max_tokens ?? 200
				},
				'high'
			)
			return res.send( 'Custom prompt done' )
		} )
	}
}

module.exports = OpenAIClient