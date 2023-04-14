const fs = require( 'fs' )
const ytdl = require( 'ytdl-core' )
const ffmpegPath = require( '@ffmpeg-installer/ffmpeg' ).path
const ffmpeg = require( 'fluent-ffmpeg' )
ffmpeg.setFfmpegPath( ffmpegPath )
const { spawn } = require( 'node:child_process' )

class SongRequest {
	constructor( expressApp, openAiClient, vtsPlugin ) {
		this.expressApp = expressApp
		this.openAiClient = openAiClient
		this.vtsPlugin = vtsPlugin
		this.songrequestId = 0
		this.pendingSongRequests = []
		this.isSongRequestInProcess = false
		this.youtubeUrl = ''
		this.chunkSeconds = 0.5
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

			this.youtubeUrl = req.body.youtube_url
			this.chunkSeconds = req.body.chunkSeconds ?? 0.5
			const isSongSuccessfullyBuilded = this.buildSong()

			if ( !isSongSuccessfullyBuilded ) {
				return res.send( 'Song could not be builded.' )
			} else {
				this.queueRemoveSongRequest( req.body.song_request_id )
				return res.send( `Song builded for ${req.body.youtube_url}` )
			}
		} )
	}

	async buildSong() {
		try {
			await this.downloadSong()
			await this.separateSong()
			this.openAiClient.isMoriSpeaking = true
			console.log( 'Start Inference' )
			await this.inferSong()
			console.log( 'Inference Done' )
			console.log( 'Start Song' )
			this.vtsPlugin.triggerHotkey( "BackgroundTransparent" )
			this.vtsPlugin.triggerHotkey( "SongRequest" )
			await this.startSong()
			this.vtsPlugin.triggerHotkey( "BackgroundBedroom" )
			this.vtsPlugin.triggerHotkey( "SongRequest" )
			console.log( 'Song Done' )
			this.openAiClient.queueReset()
		} catch ( error ) {
			console.log( error )
		}
		this.openAiClient.isMoriSpeaking = false
	}

	async downloadSong() {
		return new Promise( ( resolve, reject ) => {
			if ( !fs.existsSync( 'src/song-request/songs' ) ) {
				fs.mkdirSync( 'src/song-request/songs' );
			}
			ytdl( this.youtubeUrl, {
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
			console.log( 'chunkSeconds', this.chunkSeconds )
			const infer = spawn( 'svc', [
				'infer',
				'--model-path=src/song-request/models/G_4000.pth',
				'--config-path=src/song-request/models/config.json',
				'--transpose=0',
				'--no-auto-predict-f0',
				'--f0-method=crepe',
				`--chunk-seconds=${this.chunkSeconds}`,
				'src/song-request/htdemucs/base_song/vocals.wav',
			] )

			// infer.stdout.on( 'data', ( data ) => {
			// 	console.log( `stdout: ${data}` )
			// } )

			infer.stderr.on( 'data', ( data ) => {
				console.error( `stderr: ${data}` )
				reject( `stderr: ${data}` )
			} )

			infer.on( 'close', ( code ) => {
				resolve( 'Inference Done' )
			} )
		} )
	}

	async startSong() {
		return new Promise( ( resolve, reject ) => {
			const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VX238 (NVIDIA High Definition A ($1,$64)', 'src/song-request/htdemucs/base_song/no_vocals.wav' ] )
			// const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VoiceMeeter Input (VB-Audio Voi ($1,$64)', 'src/song-request/htdemucs/base_song/no_vocals.wav' ] )
			// const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=Haut-parleurs (2- Focusrite USB ($1,$64)', 'src/song-request/htdemucs/base_song/no_vocals.wav' ] )
			spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VoiceMeeter Input (VB-Audio Voi ($1,$64)', 'src/song-request/htdemucs/base_song/vocals.out.wav' ] )
			singingProcess.on( 'close', ( code ) => {
				resolve( 'Singing Done' )
			} )
		} )
	}
}

module.exports = SongRequest