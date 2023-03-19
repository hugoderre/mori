const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( './voicemaker.js' )
const CompletionLogger = require( './logger.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars } = require( './utils.js' )
const dotenv = require( 'dotenv' )
dotenv.config()

class OpenAIClient {
	constructor( expressApp, messagesCollection ) {
		this.expressApp = expressApp
		this.messagesCollection = messagesCollection
		this.api = this.getApi()
		this.voiceMakerAPI = new VoiceMakerAPI( this )
		this.completionLogger = new CompletionLogger()
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
				{
					"role": 'system',
					"content": "Tu t'appelles Mori, une streameuse sur Twitch avec du second degrés, sarcastique, ironique et attachante. Tu réponds aux question sur le tchat."
				},
				...prompt.messages
			],
			max_tokens: prompt.max_tokens ?? 150,
			temperature: prompt.temperature,
			user: prompt.username ? sha256( prompt.username ) : ''
		} );

		let completion = this.completionPostFormatting( escapeSpecialChars( completionObj.data.choices[ 0 ].message.content ) )
		console.log( completion )
		this.completionLogger.writeCompletion( prompt.messages[ prompt.messages.length - 1 ].content, completion )
		this.voiceMakerAPI.runTTS( completion )

		this.expressApp.emit( 'completion_completed', {
			"completion": completion
		} )

		return completion
	}

	completionPostFormatting( completion ) {
		let fCompletion = completion.replace( 'Mori:', '' )
			.replace( 'Mori :', '' )
			.replace( ';)', '' )
		return fCompletion
	}

	listenCustomPrompt() {
		this.expressApp.post( '/custom-prompt', async ( req, res ) => {
			if ( !req.body.messages ) {
				return res.send( 'Wrong body format' )
			}

			this.queueUpPrompt(
				{
					messages: req.body.messages,
					temperature: req.body.temperature ?? 0.8,
					max_tokens: req.body.max_tokens ?? 200,
					username: req.body.username ?? ''
				},
				'high'
			)

			return res.send( 'Custom prompt done' )
		} )
	}

	listenTestPrompt() {
		this.expressApp.post( '/test-prompt', async ( req, res ) => {
			if ( !req.body.messages || !req.body.username ) {
				return res.send( 'Wrong body format' )
			}

			const previousUserMessages = await this.messagesCollection.findMessagesByUsername( req.body.username ) ?? []

			const formattedPreviousUserMessages =
				previousUserMessages && previousUserMessages.messages ?
					previousUserMessages.messages.map( ( msg ) => [
						{ "role": "user", "content": msg.message },
						{ "role": "assistant", "content": msg.response },
					] ).flat()
					: []

			this.queueUpPrompt(
				{
					messages: [
						{ "role": 'user', "content": `Mori, les prochains messages sont une conversations avec le viewer "${req.body.username}". Pour tous les messages, réponds soit de façon sarcastique, ironique ou avec second degrés, soit de façon plus sympatique. Tu aimes les mangas, les jeux-vidéos, la peinture et faire des émission en direct sur Twitch. Garde TOUJOURS cette personnalité en tête.` },
						...formattedPreviousUserMessages,
						...req.body.messages
					],
					temperature: 0.8,
					top_p: 0.8,
					max_tokens: 100,
					username: req.body.username
				},
				'high'
			)

			this.expressApp.once( 'completion_completed', async ( data ) => {
				console.log( 'Send to DB' )
				const newMessage = {
					timestamp: Date.now(),
					message: req.body.messages[ 0 ].content,
					response: data.completion,
				}
				await this.messagesCollection.pushViewerMessageUpsert(
					req.body.username,
					newMessage,
					4
				)
			} )


			return res.send( 'Custom prompt done' )
		} )
	}
}

module.exports = OpenAIClient