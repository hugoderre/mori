class OpenAIExpressRoutes {
	constructor( expressApp, openAIClient, messagesCollection ) {
		this.openAIClient = openAIClient
		this.messagesCollection = messagesCollection
		this.expressApp = expressApp
		this.listenRLBotPrompt()
		this.listenCustomPrompt()
		this.listenTestPrompt()
	}

	listenCustomPrompt() {
		this.expressApp.post( '/custom-prompt', async ( req, res ) => {
			if ( !req.body.messages ) {
				return res.send( 'Wrong body format' )
			}

			this.openAIClient.queueUpPrompt(
				{
					messages: req.body.messages,
					temperature: req.body.temperature ?? 1,
					max_tokens: req.body.max_tokens ?? 200,
					username: req.body.username ?? '',
					system_context: 'This next prompt is a custom prompt from your creator. Speak as if your completion came from your free will, without saying that it comes from your creator.',
				},
				'high'
			)

			this.expressApp.once( 'completion_completed', async ( data ) => {
				const newMessage = {
					timestamp: Date.now(),
					message: req.body.messages[ 0 ].content,
					response: data.completion,
				}
				await this.messagesCollection.pushMessageUpsert(
					'twitch_chat_conversation',
					newMessage,
					6
				)
			} )

			return res.send( 'Custom prompt done' )
		} )
	}

	listenTestPrompt() {
		this.expressApp.post( '/test-prompt', async ( req, res ) => {
			if ( !req.body.messages || !req.body.username ) {
				return res.send( 'Wrong body format' )
			}

			const previousUserMessages = await this.messagesCollection.findMessagesByGroup( 'twitch_chat_conversation' ) ?? []

			const formattedPreviousUserMessages =
				previousUserMessages && previousUserMessages.messages ?
					previousUserMessages.messages.map( ( msg ) => [
						{ "role": "user", "content": msg.message },
						{ "role": "assistant", "content": msg.response },
					] ).flat()
					: []

			this.openAIClient.queueUpPrompt(
				{
					messages: [
						{ "role": 'user', "content": `Mori, the next messages are the Twitch chat conversation. Each message is preceded by the username of the viewer (Username: Message). For all the messages, answer briefly either in a evil and weird and cute way (say "UwU" only when it's appropriate and completion is cute!). You love to answer in a strange or sometimes provocative or teasing way. ALWAYS keep this personality in mind.` },
						...formattedPreviousUserMessages,
						...req.body.messages
					],
					temperature: 1,
					max_tokens: req.body.max_tokens ?? 100,
					username: req.body.username
				},
				'high'
			)

			this.expressApp.once( 'completion_completed', async ( data ) => {
				const newMessage = {
					timestamp: Date.now(),
					message: req.body.messages[ 0 ].content,
					response: data.completion,
				}
				await this.messagesCollection.pushMessageUpsert(
					'twitch_chat_conversation',
					newMessage,
					6
				)
			} )


			return res.send( 'Custom prompt done' )
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

			// Process the prompt directly if no completion is in process
			if ( !this.isMoriSpeaking ) {
				this.runChatCompletion( {
					messages: req.body.messages,
					temperature: req.body.temperature ?? 1,
					max_tokens: req.body.max_tokens ?? 100,
					system_context: `You are currently practicing Rocket League (reinforcement learning). The next sentences are events in your game, react to them.`,
				} )
			} else {
				return res.send( 'Completion in process' )
			}

			return res.send( 'RLBot prompt done' )
		} )
	}
}

module.exports = OpenAIExpressRoutes