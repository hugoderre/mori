const tmi = require( 'tmi.js' )
const { escapeSpecialChars } = require( '../utils.js' )
const LanguageModelClient = require( '../ai/LanguageModelClient.js' )
const dotenv = require( 'dotenv' )
dotenv.config()

class TmiClient {
	constructor( expressApp, messagesCollection, promptQueue ) {
		this.expressApp = expressApp
		this.messagesCollection = messagesCollection
		this.promptQueue = promptQueue
		this.startListeners()
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
		let username = tags[ 'display-name' ]

		username = username === 'Mori_IA' ? 'Creator' : username

		const timestamp = tags[ 'tmi-sent-ts' ]
		let fMessage = escapeSpecialChars( message )

		if ( !this.isValidChatMessage( username, fMessage ) ) {
			return
		}

		fMessage = username + ': ' + fMessage

		if ( tags[ 'custom-reward-id' ] === process.env.REWARD_ID_SONG_REQUEST || tags[ 'custom-reward-id' ] === process.env.REWARD_ID_PAINT_REQUEST ) {
			return
		}

		const previousUserMessages = await this.messagesCollection.findMessagesByGroup( 'twitch_chat_conversation' ) ?? []
		const formattedPreviousUserMessages = LanguageModelClient.getFormattedPreviousUserMessages( previousUserMessages )

		let personality
		const personalityRandomizer = Math.random()

		if ( personalityRandomizer < 0.8 ) {
			personality = `For all the messages, answer briefly in a sarcastic and funny manner. You like to tease people.`
		} else {
			personality = `For all the messages, answer briefly in a cute manner.`
		}

		this.promptQueue.add(
			{
				module: 'llm',
				type: 'chat_message',
				messages: [
					{ "role": 'user', "content": `Mori, the next messages are the Twitch chat conversation. Each message is preceded by the username of the viewer (Username: Message). ${personality} Keep this prompt as a reference for all the next messages.` },
					...formattedPreviousUserMessages,
					{ "role": 'user', "content": fMessage }
				],
				temperature: 1,
				username,
				callback: async ( completion ) => {
					const newMessage = {
						timestamp,
						message: fMessage,
						response: completion,
					}
					await this.messagesCollection.pushMessageUpsert(
						'twitch_chat_conversation',
						newMessage,
						9
					)
				}
			},
			'medium'
		)
	}

	subCallback( channel, username, methods, msg, tags ) {
		this.promptQueue.add( {
			module: 'llm',
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
		this.promptQueue.add( {
			module: 'llm',
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
		this.promptQueue.add( {
			module: 'llm',
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
		this.promptQueue.add( {
			module: 'llm',
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
		this.promptQueue.add( {
			module: 'llm',
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
		this.promptQueue.add( {
			module: 'llm',
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

	isValidChatMessage( username, message ) {
		if ( !message || message.length > 300 ) {
			return
		}

		const usernameDenies = [ 'Moobot', 'WizeBot' ]
		// const usernameDenies = [ 'Moobot', 'WizeBot', 'Mori_IA' ]

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

module.exports = TmiClient