const fs = require( 'fs' )
const ytdl = require( 'ytdl-core' )
const ffmpegPath = require( '@ffmpeg-installer/ffmpeg' ).path
const ffmpeg = require( 'fluent-ffmpeg' )
ffmpeg.setFfmpegPath( ffmpegPath )
const { spawn } = require( 'node:child_process' )

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

	async buildSong( youtubeUrl ) {
		try {
			await this.downloadSong( youtubeUrl )
			await this.separateSong()
			this.openAiClient.isMoriSpeaking = true
			console.log( 'Start Inference' )
			await this.inferSong()
			console.log( 'Inference Done' )
			console.log( 'Start Song' )
			await this.startSong()
			console.log( 'Song Done' )
			this.openAiClient.queueReset()
		} catch ( error ) {
			console.log( error )
		}
		this.openAiClient.isMoriSpeaking = false
	}

	async downloadSong( videoUrl ) {
		return new Promise( ( resolve, reject ) => {
			if ( !fs.existsSync( 'src/song-request/songs' ) ) {
				fs.mkdirSync( 'src/song-request/songs' );
			}
			ytdl( videoUrl, {
				filter: "audioonly",
				quality: "highest",
			} )
				.pipe( fs.createWriteStream( 'src/song-request/songs/base_song.mp4' ) )
				.on( 'finish', () => {
					ffmpeg( 'src/song-request/songs/base_song.mp4' )
						.format( 'wav' )
						.save( 'src/song-request/songs/base_song.wav' )
						.on( 'end', () => {
							console.log( 'Conversion terminée.' )
							resolve()
						} )
				} )
		} )
	}

	async separateSong() {
		return new Promise( ( resolve, reject ) => {
			const demucs = spawn( 'demucs', [ '--two-stems=vocals', '--out=src/song-request', 'src/song-request/songs/base_song.wav' ] )
			demucs.on( 'close', ( code ) => {
				resolve( 'Separation Done' )
			} )
		} )
	}

	async inferSong() {
		return new Promise( ( resolve, reject ) => {
			const infer = spawn( 'svc', [
				'infer',
				'--model-path=src/song-request/models/G_4000.pth',
				'--config-path=src/song-request/models/config.json',
				'--transpose=0',
				'--no-auto-predict-f0',
				'--f0-method=crepe',
				'src/song-request/htdemucs/base_song/vocals.wav',
			] )

			infer.on( 'close', ( code ) => {
				resolve( 'Inference Done' )
			} )
		} )
	}

	async startSong() {
		return new Promise( ( resolve, reject ) => {
			const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VX238 (NVIDIA High Definition A ($1,$64)', 'src/song-request/htdemucs/base_song/no_vocals.wav' ] )
			spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VoiceMeeter Input (VB-Audio Voi ($1,$64)', 'src/song-request/htdemucs/base_song/vocals.out.wav' ] )
			singingProcess.on( 'close', ( code ) => {
				resolve( 'Singing Done' )
			} )
		} )
	}
}

module.exports = SongRequest