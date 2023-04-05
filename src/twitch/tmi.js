const tmi = require( 'tmi.js' )
const { escapeSpecialChars } = require( './../utils.js' )

class TmiApiClient {
	constructor( expressApp, openAIClient, messagesCollection ) {
		this.expressApp = expressApp
		this.openAIClient = openAIClient
		this.messagesCollection = messagesCollection
	}

	startListeners() {
		const client = new tmi.Client( {
			channels: [ 'mori_ia' ]
		} );

		client.connect();

		client.on( 'message', this.messageCallback.bind( this ) );
		client.on( 'cheer', this.cheerCallback.bind( this ) );
		client.on( 'sub', this.subCallback.bind( this ) );
		client.on( 'resub', this.resubCallback.bind( this ) );
		client.on( 'subgift', this.subgiftCallback.bind( this ) );
		client.on( 'anonsubgift', this.anonsubgiftCallback.bind( this ) );
		client.on( 'raid', this.raidCallback.bind( this ) );
	}

	async messageCallback( channel, tags, message, self ) {
		const username = tags[ 'display-name' ]
		const timestamp = tags[ 'tmi-sent-ts' ]
		const fMessage = escapeSpecialChars( message )

		if ( !this.isValidChatMessage( username, fMessage ) ) {
			return
		}

		const previousUserMessages = await this.messagesCollection.findMessagesByUsername( username ) ?? []

		const formattedPreviousUserMessages =
			previousUserMessages && previousUserMessages.messages ?
				previousUserMessages.messages.map( ( msg ) => [
					{ "role": "user", "content": msg.message },
					{ "role": "assistant", "content": msg.response },
				] ).flat()
				: []

		this.openAIClient.queueUpPrompt(
			{
				type: 'chat_message',
				messages: [
					{ "role": 'user', "content": `Mori, the next messages are a conversation with the viewer "${username}". For all messages, respond either in a sarcastic, ironic or second degree way, or in a more sympathetic way. Always keep this personality in mind.` },
					...formattedPreviousUserMessages,
					{ "role": 'user', "content": fMessage }
				],
				temperature: 1,
				username
			},
			'low'
		)

		this.expressApp.once( 'completion_completed', async ( data ) => {
			const newMessage = {
				timestamp,
				message: fMessage,
				response: data.completion,
			}
			await this.messagesCollection.pushViewerMessageUpsert(
				username,
				newMessage,
				4
			)
		} )
	}

	subCallback( channel, username, methods, msg, tags ) {
		this.openAIClient.queueUpPrompt( {
			type: 'sub',
			messages: [
				{ "role": 'user', "content": `Mori, the viewer "${username}" just subscribed to your Twitch channel for the first time. Please thank him warmly and in a nice way.` }
			],
			temperature: 0.5,
			username: username
		},
			'high'
		)
	}

	cheerCallback( channel, tags, message ) {
		this.openAIClient.queueUpPrompt( {
			type: 'cheer',
			messages: [
				{ "role": 'user', "content": `Mori, the viewer "${tags.username}" has just offered ${tags.bits} bits to your Twitch channel. Please thank him warmly and in a nice way.` }
			],
			temperature: 0.5,
			username: tags.username
		},
			'high'
		)
	}

	resubCallback( channel, username, streakMonths, msg, tags, methods ) {
		this.openAIClient.queueUpPrompt( {
			type: 'resub',
			messages: [
				{ "role": 'user', "content": `Mori, the viewer "${username}" has just re-subscribed to your Twitch channel. This is his ${tags[ 'badge-info' ].subscriber}th month of subscription. Please thank him warmly and in a nice way.` }
			],
			temperature: 0.5,
			username: username
		},
			'high'
		)
	}

	subgiftCallback( channel, username, streakMonths, recipient, methods, tags ) {
		this.openAIClient.queueUpPrompt( {
			type: 'subgift',
			messages: [
				{ "role": 'user', "content": `Mori, the viewer "${username}" has just offered a gift subscription to ${recipient} to your Twitch channel. Please thank ${username} warmly and in a nice way.` }
			],
			temperature: 0.5,
			username: username
		},
			'high'
		)
	}

	anonsubgiftCallback( channel, streakMonths, recipient, methods, tags ) {
		this.openAIClient.queueUpPrompt( {
			type: 'anonsubgift',
			messages: [
				{ "role": 'user', "content": `Mori, an anonymous viewer just offered a gift subscription to ${recipient} to your Twitch channel. Please thank this anonymous viewer warmly and in a creative way.` }
			],
			temperature: 0.5,
			username: ''
		},
			'high'
		)
	}

	raidCallback( channel, username, viewers, tags ) {
		this.openAIClient.queueUpPrompt( {
			type: 'raid',
			messages: [
				{ "role": 'user', "content": `Mori, you just received a raid on your Twitch channel from ${username}, thank him warmly and welcome the ${viewers} viewers!` }
			],
			temperature: 0.5,
			username: username
		},
			'high'
		)
	}

	redeemCallback( channel, username, rewardtype, tags, msg ) {
		console.log( 'pass' )
		console.log( channel, username, rewardtype, tags, msg )
	}

	isValidChatMessage( username, message ) {
		if ( !message || message.length > 300 ) {
			return
		}

		const usernameDenies = [ 'Moobot', 'WizeBot', 'Mori_IA' ]

		if ( usernameDenies.some( u => username.includes( u ) ) ) {
			return
		}

		const firstCharDenies = [ '@', '!', '/' ]

		if ( firstCharDenies.some( c => message[ 0 ].includes( c ) ) ) {
			return
		}

		return true
	}
}

module.exports = TmiApiClient