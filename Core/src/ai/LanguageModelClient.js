const fs = require( 'fs' )
require( 'dotenv' ).config()
const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( '../tts/VoicemakerClient.js' )
const CompletionLogger = require( './CompletionLogger.js' )
const { Bot: DiscordBot } = require( '../discord/Bot.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars, downloadImageFromUrl } = require( '../utils.js' )

class LanguageModelClient {
	constructor( expressApp, messagesCollection, vtsPlugin, slobs, promptQueue ) {
		this.expressApp = expressApp
		this.messagesCollection = messagesCollection
		this.vtsPlugin = vtsPlugin
		this.slobs = slobs
		this.promptQueue = promptQueue
		this.api = this.getApi()
		this.voiceMakerAPI = new VoiceMakerAPI( this )
		this.completionLogger = new CompletionLogger()
		this.isSongRequestInProcess = false
	}

	getApi() {
		const configuration = new Configuration( {
			apiKey: process.env.OPENAI_API_KEY,
		} );
		return new OpenAIApi( configuration );
	}

	/**
	 * Fire by prompt queue
	 */
	async runProcess( prompt ) {
		await this.runChatCompletion( prompt )
	}

	async runChatCompletion( prompt ) {
		if ( prompt.type === 'chat_message' ) {
			this.vtsPlugin.triggerHotkey( "Look Chat" )
		}

		let completionObj

		try {
			completionObj = await this.requestApiWithRetryAndTimeout( 3, 1000, 20000, this.chatCompletionRequest.bind( this ), prompt );
		} catch ( error ) {
			console.error( "Erreur lors de la création de la completion :", error );
			return
		}

		const promptMessage = prompt.messages[ prompt.messages.length - 1 ].content
		const completion = LanguageModelClient.chatCompletionFormatting( escapeSpecialChars( completionObj.data.choices[ 0 ].message.content ) )

		if ( prompt.type === 'vtsItemTrigger' ) {
			this.vtsPlugin.triggerHotkey( prompt.vtsHotkeyName )
		}

		console.log( '------------------' )
		console.log( 'Prompt : ', promptMessage )
		console.log( 'Completion : ', completion )

		this.completionLogger.writeCompletion( promptMessage, completion )

		if ( prompt.type === 'chat_message' ) {
			this.vtsPlugin.triggerHotkey( "Look Chat" )
		}

		await this.voiceMakerAPI.runTTS( completion )
			.then( () => {
				this.vtsPlugin.triggerHotkeyByKeywordInString( completion )
			} )
			.catch( ( error ) => {
				console.error( 'Erreur lors du traitement Text-to-Speech : ', error )
			} );

		if ( prompt.callback ) {
			prompt.callback( completion )
		}

		this.secondsSinceLastChatCompletion = 0

		return completion
	}

	chatCompletionRequest( prompt ) {
		const completionSystemContext = prompt.system_context ?? "You are answering questions on your Twitch chat and awaiting for song request.";
		const completionPromise = this.api.createChatCompletion( {
			model: process.env.OPENAI_CHAT_MODEL,
			messages: [
				{
					role: 'system',
					content:
						"You are Mori, a young female Twitch streamer. You are sarcasstic, teasing and a big ego. You're currently in live on Twitch. " + completionSystemContext,
				},
				...prompt.messages,
			],
			max_tokens: prompt.max_tokens ?? 200,
			temperature: prompt.temperature,
			presence_penalty: 1,
			frequency_penalty: 1,
			user: prompt.username ? sha256( prompt.username ) : '',
		} );

		return completionPromise
	}

	async runImageCompletion( prompt ) {
		let completionObj

		try {
			completionObj = await this.requestApiWithRetryAndTimeout( 3, 1000, 11000, this.imageCompletionRequest.bind( this ), prompt );
		} catch ( error ) {
			console.error( "Erreur lors de la création de l'image :", error );
			return
		}

		let imageUrl;
		try {
			imageUrl = completionObj.data.data[ 0 ].url
		} catch ( error ) {
			console.error( "Erreur lors du formatage de l'image :", error );
			return
		}

		// Create image file from imageUrl in /assets/slobs folder
		const imagePath = './assets/slobs/painting.jpg'
		if ( !fs.existsSync( './assets/slobs/' ) ) {
			fs.mkdirSync( './assets/slobs/' )
		}
		await downloadImageFromUrl( imageUrl, imagePath )


		this.vtsPlugin.triggerHotkey( "Painting" )
		this.slobs.setChevaletVisibility( true )
		this.slobs.setPaintingCompletedVisibility( false )

		// Queue up a chat completion (painting done) + callback that display image on screen
		this.promptQueue.add( {
			module: 'llm',
			type: 'chat_message',
			messages: [
				{ "role": 'user', "content": `Mori, you just finished painting your canvas on the theme "${prompt}" and it is now on the screen! React briefly on what you think of your painting!` }
			],
			temperature: 0.9,
			callback: () => {
				this.vtsPlugin.triggerHotkey( "Painting" )
				this.slobs.setChevaletVisibility( false )
				this.slobs.setPaintingCompletedVisibility( true )
			}
		},
			'veryhigh'
		)

		DiscordBot.sendFileToChannel( 'post_image', imagePath, prompt )

		return imageUrl
	}

	imageCompletionRequest( prompt ) {
		const completionPromise = this.api.createImage( {
			"prompt": prompt + ', digital art',
			"n": 1,
			"size": "256x256",
			"response_format": "url"
		} )

		return completionPromise
	}

	async requestApiWithRetryAndTimeout( maxRetries, retryDelay, timeout, completionRequest, prompt ) {
		for ( let attempt = 1; attempt <= maxRetries; attempt++ ) {
			try {
				const completionPromise = completionRequest( prompt );

				const completionObj = await Promise.race( [
					completionPromise,
					new Promise( ( _, reject ) => setTimeout( () => reject( new Error( 'Timeout Completion' ) ), timeout ) ),
				] );

				return completionObj
			} catch ( error ) {
				console.error( `Erreur lors de la tentative ${attempt}:`, error );

				if ( attempt === maxRetries ) {
					throw new Error( "Nombre maximal de tentatives atteint. Échec de la requête." );
				}

				await new Promise( ( resolve ) => setTimeout( resolve, retryDelay ) );
			}
		}

		throw new Error( "Nombre maximal de tentatives atteint. Échec de la requête." );
	}

	queueUpRandomPrompt() {
		const prompts = fs.readFileSync( './src/ai/random-prompts.txt', 'utf8' ).split( '\n' )
		const prompt = prompts[ Math.floor( Math.random() * prompts.length ) ].replace( '\r', '' )
		this.promptQueue.add(
			{
				module: 'llm',
				messages: [ { "role": "user", "content": prompt } ],
				temperature: 1,
				system_context: 'This next prompt is a custom prompt from your creator. Speak as if your completion came from your free will, without saying that it comes from your creator.',
				callback: async ( completion ) => {
					const newMessage = {
						timestamp: Date.now(),
						message: prompt,
						response: completion,
					}
					await this.messagesCollection.pushMessageUpsert(
						'twitch_chat_conversation',
						newMessage,
						6
					)
				}
			},
			'low',
		)
	}

	static chatCompletionFormatting( completion ) {
		let fCompletion = completion.replace( 'Mori:', '' )
			.replace( 'Mori :', '' )
			.replace( ';)', '' )
		return fCompletion
	}

	static getFormattedPreviousUserMessages( previousUserMessages ) {
		return previousUserMessages && previousUserMessages.messages ?
			previousUserMessages.messages.map( ( msg ) => [
				{ "role": "user", "content": msg.message },
				{ "role": "assistant", "content": msg.response },
			] ).flat()
			: []
	}
}

module.exports = LanguageModelClient