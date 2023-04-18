const fs = require( 'fs' )
require( 'dotenv' ).config()
const { Configuration, OpenAIApi } = require( 'openai' )
const VoiceMakerAPI = require( '../tts/voicemaker.js' )
const CompletionLogger = require( '../logger.js' )
const { sha256 } = require( 'js-sha256' )
const { escapeSpecialChars, downloadImageFromUrl } = require( '../utils.js' )

class OpenAIClient {
	constructor( expressApp, messagesCollection, vtsPlugin, slobs ) {
		this.expressApp = expressApp
		this.messagesCollection = messagesCollection
		this.vtsPlugin = vtsPlugin
		this.slobs = slobs
		this.api = this.getApi()
		this.voiceMakerAPI = new VoiceMakerAPI( this )
		this.completionLogger = new CompletionLogger()
		this.promptQueue = {
			low: [],
			medium: [],
			high: []
		}
		this.promptQueueIntervalRef = null
		this.isMoriSpeaking = false
		this.isSongRequestInProcess = false
		this.initPromptQueue()
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

	queueReset() {
		this.promptQueue = {
			low: [],
			medium: [],
			high: []
		}
	}

	softQueueReset() {
		this.promptQueue.medium = []
		this.promptQueue.low = []
	}

	initPromptQueue() {
		this.promptQueueIntervalRef = setInterval( async () => {
			if ( this.isMoriSpeaking || this.isSongRequestInProcess ) {
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
		if ( this.isMoriSpeaking || this.isSongRequestInProcess ) {
			return
		}
		this.isMoriSpeaking = true
		let completionObj

		if ( prompt.type === 'chat_message' ) {
			this.vtsPlugin.triggerHotkey( "Look Chat" )
		}

		try {
			completionObj = await this.requestApiWithRetryAndTimeout( 3, 1000, 11000, this.chatCompletionRequest.bind( this ), prompt );
		} catch ( error ) {
			this.isMoriSpeaking = false
			console.error( "Erreur lors de la création de la completion :", error );
			return
		}

		if ( prompt.type === 'vtsItemTrigger' ) {
			this.vtsPlugin.triggerHotkey( prompt.vtsHotkeyName )
		}

		let completion;
		try {
			completion = this.chatCompletionFormatting( escapeSpecialChars( completionObj.data.choices[ 0 ].message.content ) )
		} catch ( error ) {
			this.isMoriSpeaking = false
			console.error( "Erreur lors du formatage de la completion :", error );
			return
		}

		console.log( 'Completion received and formatted : ', completion )

		this.completionLogger.writeCompletion( prompt.messages[ prompt.messages.length - 1 ].content, completion )

		if ( prompt.type === 'chat_message' ) {
			this.vtsPlugin.triggerHotkey( "Look Chat" )
		}

		this.voiceMakerAPI.runTTS( completion )
			.catch( ( error ) => {
				console.error( 'Erreur lors du traitement Text-to-Speech : ', error )
				this.isMoriSpeaking = false
			} );

		this.expressApp.emit( 'completion_completed', {
			"completion": completion
		} )

		if ( prompt.callback ) {
			prompt.callback()
		}

		return completion
	}

	chatCompletionRequest( prompt ) {
		const completionSystemContext = prompt.system_context ?? "Currently you are answering questions on your Twitch chat and awaiting for song request.";
		// const completionSystemContext = prompt.system_context ?? "Currently you are training for Rocket League and answering questions on your Twitch chat.";
		const completionPromise = this.api.createChatCompletion( {
			model: process.env.OPENAI_CHAT_MODEL,
			messages: [
				{
					role: 'system',
					content:
						"You are Mori, a female Twitch streamer with a weird, cute and evil personality. You like manga, video games and doing live streams on Twitch. " + completionSystemContext,
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

	chatCompletionFormatting( completion ) {
		let fCompletion = completion.replace( 'Mori:', '' )
			.replace( 'Mori :', '' )
			.replace( ';)', '' )
		return fCompletion
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
		if ( !fs.existsSync( './assets/slobs/' ) ) {
			fs.mkdirSync( './assets/slobs/' )
		}
		await downloadImageFromUrl( imageUrl, './assets/slobs/painting.jpg' )

		console.log( 'Image received and formatted : ', imageUrl )

		this.vtsPlugin.triggerHotkey( "Painting" )
		this.slobs.setChevaletVisibility( true )
		this.slobs.setPaintingCompletedVisibility( false )

		// Queue up a chat completion (painting done) + callback that display image on screen
		this.queueUpPrompt( {
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
			'high'
		)

		return imageUrl
	}

	imageCompletionRequest( prompt ) {
		const completionPromise = this.api.createImage( {
			prompt,
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

				return completionObj;
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
}

module.exports = OpenAIClient