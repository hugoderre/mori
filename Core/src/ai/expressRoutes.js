const LanguageModelClient = require( './LanguageModelClient.js' )
const { escapeSpecialChars } = require( '../utils.js' )

class ExpressRoutes {
	constructor( expressApp, languageModelClient, messagesCollection, promptQueue ) {
		this.expressApp = expressApp
		this.languageModelClient = languageModelClient
		this.messagesCollection = messagesCollection
		this.promptQueue = promptQueue
		this.listenCustomPrompt()
		this.listenTestPrompt()
		this.listenDiscordBotPrompt()
		this.listenRLBotPrompt()
	}

	listenCustomPrompt() {
		this.expressApp.post( '/custom-prompt', async ( req, res ) => {
			if ( !req.body.messages ) {
				return res.send( 'Wrong body format' )
			}

			this.promptQueue.add(
				{
					module: 'llm',
					messages: req.body.messages,
					temperature: req.body.temperature ?? 1,
					max_tokens: req.body.max_tokens ?? 200,
					username: req.body.username ?? '',
					system_context: req.body.system_context ?? 'This next prompt is a custom prompt from your creator. Speak as if your completion came from your free will, without saying that it comes from your creator.',
					callback: async ( completion ) => {
						const newMessage = {
							timestamp: Date.now(),
							message: req.body.messages[ 0 ].content,
							response: completion,
						}
						await this.messagesCollection.pushMessageUpsert(
							'twitch_chat_conversation',
							newMessage,
							6
						)
					}
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

			const previousUserMessages = await this.messagesCollection.findMessagesByGroup( 'twitch_chat_conversation' ) ?? []
			const formattedPreviousUserMessages = LanguageModelClient.getFormattedPreviousUserMessages( previousUserMessages )

			let personality
			const personalityRandomizer = Math.random()

			if ( personalityRandomizer < 0.65 ) {
				personality = `For all the messages, answer briefly in a sarcastic and funny manner. You like to tease people.`
			} else {
				personality = `For all the messages, answer briefly in a cute manner (say "UwU" only when it's appropriate and completion is cute!).`
			}

			this.promptQueue.add(
				{
					module: 'llm',
					messages: [
						{ "role": 'user', "content": `Mori, the next messages are the Twitch chat conversation. Each message is preceded by the username of the viewer (Username: Message). ${personality} Keep this prompt as a reference for all the next messages.` },
						...formattedPreviousUserMessages,
						...req.body.messages
					],
					temperature: 1,
					max_tokens: req.body.max_tokens ?? 100,
					username: req.body.username,
					callback: async ( completion ) => {
						const newMessage = {
							timestamp: Date.now(),
							message: req.body.messages[ 0 ].content,
							response: completion,
						}
						await this.messagesCollection.pushMessageUpsert(
							'twitch_chat_conversation',
							newMessage,
							6
						)
					}
				},
				'high'
			)

			return res.send( 'Custom prompt done' )
		} )
	}

	listenDiscordBotPrompt() {
		this.expressApp.post( '/discord-bot-prompt', async ( req, res ) => {
			if ( !req.body.messages || !req.body.username ) {
				return res.send( {
					code: 500,
					message: "Discord Bot Prompt Request: Wrong body format"
				} );
			}

			const username = req.body.username === 'Mori' ? 'Creator' : req.body.username
			const previousUserMessages = await this.messagesCollection.findMessagesByGroup( `discord_chat_user_${username}` ) ?? []
			const formattedPreviousUserMessages = LanguageModelClient.getFormattedPreviousUserMessages( previousUserMessages )

			const prompt = {
				messages: [
					{ "role": 'user', "content": `Mori, the next messages are the Discord chat conversation with the viewer ${username}. For all the messages, answer briefly (Maximum 2 sentences) in a sarcastic and funny manner. You like to tease people. When necessary you can use cute emotes like ヾ(・ω・*)ノ for example. Keep this prompt as a reference for all the next messages.` },
					...formattedPreviousUserMessages,
					...req.body.messages
				],
				temperature: req.body.temperature ?? 1,
				max_tokens: req.body.max_tokens ?? 100,
				username,
				system_context: "Currently, you are not in streaming and you are answering to people on your Discord server.",
			}

			let completionObj
			try {
				completionObj = await this.languageModelClient.requestApiWithRetryAndTimeout(
					3,
					1000,
					11000,
					this.languageModelClient.chatCompletionRequest.bind( this.languageModelClient ),
					prompt
				);
			} catch ( error ) {
				return res.send( {
					code: 500,
					message: "OpenAI API Completion Timeout: Maximum number of attempts reached. Request failed."
				} );
			}

			const completion = LanguageModelClient.chatCompletionFormatting( completionObj.data.choices[ 0 ].message.content )

			const newMessage = {
				timestamp: Date.now(),
				message: req.body.messages[ 0 ].content,
				response: completion,
			}
			await this.messagesCollection.pushMessageUpsert(
				`discord_chat_user_${username}`,
				newMessage,
				4
			)

			return res.send( {
				code: 200,
				message: completion
			} );
		} )
	}

	/**
	 * Listen to RLBot POST requests, deny prompt if a chat completion is already in process
	 */
	listenRLBotPrompt() {
		this.expressApp.post( '/rlbot-prompt', async ( req, res ) => {
			if ( !req.body.messages ) {
				return res.send( 'Wrong body format' )
			}

			this.promptQueue.add(
				{
					module: 'llm',
					messages: req.body.messages,
					temperature: req.body.temperature ?? 1,
					max_tokens: req.body.max_tokens ?? 200,
					username: req.body.username ?? '',
					callback: async ( completion ) => {
						const newMessage = {
							timestamp: Date.now(),
							message: req.body.messages[ 0 ].content,
							response: completion,
						}
						await this.messagesCollection.pushMessageUpsert(
							'twitch_chat_conversation',
							newMessage,
							6
						)
					}
				},
				'high'
			)

			return res.send( 'Custom prompt done' )
		} )
	}
}

module.exports = { ExpressRoutes }