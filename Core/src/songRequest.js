class SongRequest {
	constructor( expressApp, openAiClient ) {
		this.expressApp = expressApp
		this.openAiClient = openAiClient
		this.songrequestId = 0
		this.pendingSongRequests = []
		this.isSongRequestInProcess = false
		this.listenSongRequestApproval()
	}

	queueUpSongRequest( songName ) {
		this.pendingSongRequests.push( {
			id: this.songrequestId,
			songName
		} )
		this.songrequestId++
		console.log( this.pendingSongRequests )
	}

	queueRemoveSongRequest( songrequestId ) {
		this.pendingSongRequests = this.pendingSongRequests.filter( songRequest => songRequest.id !== songrequestId )
	}

	queueGetSongRequestNameById( songrequestId ) {
		return this.pendingSongRequests.find( songRequest => songRequest.id === songrequestId )?.songName
	}

	listenSongRequestApproval() {
		this.expressApp.post( '/song-request-approval', async ( req, res ) => {
			const songName = this.queueGetSongRequestNameById( req.body.song_request_id )

			if ( this.isSongRequestInProcess ) {
				return res.send( 'Song request is in process.' )
			}

			if ( !req.body.is_approved ) {
				this.openAiClient.queueUpPrompt( {
					type: 'chat_message',
					messages: [
						{ "role": 'user', "content": `Mori, tell the Twitch chat that you won't be able to sing for the song request "${songName}" ${req.body.reason ? `for the reason: "${req.body.reason}"` : ''}, but you are waiting for another song request!` }
					],
					temperature: 0.9
				},
					'high'
				)

				this.queueRemoveSongRequest( req.body.song_request_id )
				return res.send( `Song request ${req.body.song_request_id} not approved.` )
			}

			if ( !req.body.youtube_url ) {
				return res.send( 'Youtube URL not provided.' )
			}

			const isSongSuccessfullyBuilded = this.buildSong( req.body.youtube_url )

			if ( !isSongSuccessfullyBuilded ) {
				return res.send( 'Song could not be builded.' )
			} else {
				this.queueRemoveSongRequest( req.body.song_request_id )
				return res.send( `Song builded for ${req.body.youtube_url}` )
			}
		} )
	}

	buildSong( youtubeURL ) {

		console.log( 'Building song for ', youtubeURL )

		return true
	}

}

module.exports = SongRequest