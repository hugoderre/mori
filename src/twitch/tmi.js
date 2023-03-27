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
					{ "role": 'user', "content": `Mori, les prochains messages sont une conversations avec le viewer "${username}". Pour tous les messages, réponds soit de façon sarcastique, ironique ou avec second degrés, soit de façon plus sympatique. Garde toujours cette personnalité en tête.` },
					...formattedPreviousUserMessages,
					{ "role": 'user', "content": fMessage }
				],
				temperature: 0.8,
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
				{ "role": 'user', "content": `Mori, le viewer "${username}" vient de s'abonner à ta chaine Twitch pour la première fois. Remerçie le chaleureusement et de façon conçise.` }
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
				{ "role": 'user', "content": `Mori, le viewer "${tags.username}" vient d'offrir ${tags.bits} bits à ta chaine Twitch. Remerçie le chaleureusement et de façon conçise.` }
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
				{ "role": 'user', "content": `Mori, le viewer "${username}" vient de se réabonner à ta chaine Twitch. C'est son ${tags[ 'badge-info' ].subscriber}ème mois d'abonnement. Remerçie le chaleureusement et de façon conçise.` }
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
				{ "role": 'user', "content": `Mori, le viewer "${username}" vient d'offrir un abonnement cadeau à ${recipient} à ta chaine Twitch. Remerçie ${username} chaleureusement et de façon conçise.` }
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
				{ "role": 'user', "content": `Mori, un viewer anonyme vient d'offrir un abonnement cadeau à ${recipient} à ta chaine Twitch. Remerçie ce viewer anonyme chaleureusement et de façon conçise.` }
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
				{ "role": 'user', "content": `Mori, tu viens de recevoir un raid sur ta chaine Twitch de la part de ${username}, remerçie le et souhaite la bienvenue aux ${viewers} viewers !` }
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