const fs = require( 'fs' )
const ytdl = require( 'ytdl-core' )
const ffmpegPath = require( '@ffmpeg-installer/ffmpeg' ).path
const ffmpeg = require( 'fluent-ffmpeg' )
ffmpeg.setFfmpegPath( ffmpegPath )
const { spawn } = require( 'node:child_process' )
const path = require( 'path' );

class SongRequest {
	constructor( expressApp, openAiClient, vtsPlugin, slobs ) {
		this.expressApp = expressApp
		this.openAiClient = openAiClient
		this.vtsPlugin = vtsPlugin
		this.slobs = slobs
		this.songName = ''
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
		return this.pendingSongRequests.find( songRequest => songRequest.id === songrequestId )?.songName ?? ''
	}

	listenSongRequestApproval() {
		this.expressApp.post( '/song-request-approval', async ( req, res ) => {
			this.songName = this.queueGetSongRequestNameById( req.body.song_request_id )

			if ( this.isSongRequestInProcess ) {
				return res.send( 'Song request is in process.' )
			}

			if ( !req.body.is_approved ) {
				this.openAiClient.queueUpPrompt( {
					type: 'chat_message',
					messages: [
						{ "role": 'user', "content": `Mori, tell the Twitch chat that you won't be able to sing for the song request "${this.songName}" ${req.body.reason ? `for the reason: "${req.body.reason}"` : ''}, but you are waiting for another song request!` }
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

			this.slobs.setSongRequestInferNoticeVisibility( true )

			console.log( 'Start Inference' )
			await this.inferSong()
			console.log( 'Inference Done' )

			this.slobs.setSongRequestInferNoticeVisibility( false )
			this.openAiClient.isMoriSpeaking = true
			this.openAiClient.isSongRequestInProcess = true
			this.vtsPlugin.triggerHotkey( "BackgroundTransparent" )
			this.vtsPlugin.triggerHotkey( "SongRequest" )
			this.writeSongNameInFile()
			this.slobs.setSongNameVisibility( true )
			this.slobs.muteMic( true );
			this.slobs.setSubtitleVisibility( false )

			console.log( 'Start Song' )
			await this.startSong()
			console.log( 'Song Done' )
			this.vtsPlugin.triggerHotkey( "BackgroundBedroom" )
			this.vtsPlugin.triggerHotkey( "SongRequest" )

			this.openAiClient.softQueueReset()
		} catch ( error ) {
			console.log( error )
		}
		this.slobs.setSongNameVisibility( false )
		this.slobs.muteMic( false );
		this.slobs.setSubtitleVisibility( true )
		this.slobs.setSongRequestInferNoticeVisibility( false )
		this.openAiClient.isMoriSpeaking = false
		this.openAiClient.isSongRequestInProcess = false
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
			const inferPath = path.join( __dirname, 'so-vits-svc/inference.py' );
			const infer = spawn( 'py', [ inferPath ] );

			infer.stdout.on( 'data', ( data ) => {
				console.log( `stdout: ${data}` )
			} )

			infer.stderr.on( 'data', ( data ) => {
				console.error( `stderr: ${data}` )
				reject( `stderr: ${data}` )
			} )

			infer.on( 'close', ( code ) => {
				resolve( 'Inference Done' )
			} )
		} )
	}

	async writeSongNameInFile() {
		return new Promise( ( resolve, reject ) => {
			fs.writeFile( path.join( __dirname, 'slobs_song_name.txt' ), this.songName, ( err ) => {
				if ( err ) {
					console.log( err )
					reject( err )
				}
				resolve()
			} )
		} )
	}

	async startSong() {
		return new Promise( ( resolve, reject ) => {
			const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VX238 (NVIDIA High Definition A ($1,$64)', 'src/song-request/htdemucs/base_song/full.wav' ] )
			spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-volume=1', '--waveout-audio-device=VoiceMeeter Input (VB-Audio Voi ($1,$64)', 'src/song-request/htdemucs/base_song/vocals.out.wav' ] )
			// const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-audio-device=VoiceMeeter Input (VB-Audio Voi ($1,$64)', 'src/song-request/htdemucs/base_song/no_vocals.wav' ] )
			// const singingProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', '--aout=waveout', '--waveout-volume=1', '--waveout-audio-device=Haut-parleurs (2- Focusrite USB ($1,$64)', 'src/song-request/htdemucs/base_song/full.wav' ] )
			singingProcess.on( 'close', ( code ) => {
				resolve( 'Singing Done' )
			} )
		} )
	}
}

module.exports = SongRequest