const MongoCrud = require( './mongoCrud' )

class MessagesCollection extends MongoCrud {
	async pushMessageUpsert( group, newMessage, limit ) {
		await this.upsertDocument(
			'messages',
			{ group: group },
			{
				$push: {
					messages: {
						$each: [ newMessage ],
						$slice: -limit,
					}
				},
				$setOnInsert: {
					group: group,
				},
			}
		)
	}

	async findMessagesByGroup( group ) {
		return await this.findDocument( 'messages', { group } )
	}

	async findAllMessages() {
		return await this.findAllDocuments( 'messages' )
	}

	async deleteAllMessages() {
		await this.client.db( process.env.MONGODB_DBNAME ).collection( 'messages' ).deleteMany( {} )
	}
}

module.exports = MessagesCollection