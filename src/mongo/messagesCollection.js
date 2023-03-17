const MongoCrud = require( './mongoCrud' )

class MessagesCollection extends MongoCrud {
	async pushViewerMessageUpsert( username, newMessage, limit ) {
		await this.upsertDocument(
			'messages',
			{ username: username },
			{
				$push: {
					messages: {
						$each: [ newMessage ],
						$slice: -limit,
					}
				},
				$setOnInsert: {
					username: username,
				},
			}
		)
	}

	async findMessagesByUsername( username ) {
		return await this.findDocument( 'messages', { username } )
	}

	async findAllMessages() {
		return await this.findAllDocuments( 'messages' )
	}
}

module.exports = MessagesCollection