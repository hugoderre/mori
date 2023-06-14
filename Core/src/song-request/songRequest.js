const fs = require( 'fs' )
const path = require( 'path' );
const ytdl = require( 'ytdl-core' )
const ffmpegPath = require( '@ffmpeg-installer/ffmpeg' ).path
const ffmpeg = require( 'fluent-ffmpeg' )
ffmpeg.setFfmpegPath( ffmpegPath )
const { spawn } = require( 'node:child_process' )
const { Bot: DiscordBot } = require( '../discord/Bot.js' )
const { getLatestFileFromDir } = require( '../utils.js' )
const AudioContext = require( "web-audio-api" ).AudioContext;
const MusicTempo = require( "music-tempo" );
const dotenv = require( 'dotenv' )
dotenv.config()

class SongRequest {
	constructor( expressApp, vtsPlugin, slobs, promptQueue ) {
		this.expressApp = expressApp
		this.vtsPlugin = vtsPlugin
		this.slobs = slobs
		this.promptQueue = promptQueue
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
			this.songName = req.body.song_name ?? this.queueGetSongRequestNameById( req.body.song_request_id )

			if ( this.isSongRequestInProcess ) {
				return res.send( 'Song request is in process.' )
			}

			if ( !req.body.is_approved ) {
				this.promptQueue.add( {
					module: 'llm',
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

			this.promptQueue.add(
				{
					module: 'sr',
				},
				'high',
			)
		} catch ( error ) {
			console.error( error )
		}
	}

	/**
	 * Fire by prompt queue
	 */
	async runProcess() {
		this.slobs.setSongRequestInferNoticeVisibility( false )
		this.vtsPlugin.triggerHotkey( "BackgroundTransparent" )
		this.vtsPlugin.triggerHotkey( "SongRequest" )
		this.vtsPlugin.triggerHotkey( "BodySinging" )
		this.writeSongNameInFile()
		this.slobs.setSongNameVisibility( true )
		this.slobs.muteMic( true );
		this.slobs.setSubtitleVisibility( false )

		await this.slobs.startRecording()
		try {
			await this.headbangOnTempo()
		} catch ( error ) {
			console.error( error )
		}

		await this.startSong()
		clearInterval( this.headbangInterval )
		await this.slobs.stopRecording()

		// Wait for the video to be saved properly after stopping the recording
		setTimeout( () => {
			try {
				DiscordBot.sendSongRequestVideoToChannel( 'post_music', getLatestFileFromDir( process.env.SONG_REQUEST_VIDEOS_DIR ), this.songName )
			} catch ( error ) {
				console.log( 'sendSongRequestVideoToChannel', error )
			}
		}, 5000 )

		this.vtsPlugin.triggerHotkey( "BackgroundBedroom" )
		this.vtsPlugin.triggerHotkey( "SongRequest" )
		this.vtsPlugin.triggerHotkey( "BodySinging" )

		this.promptQueue.softReset()

		this.slobs.setSongNameVisibility( false )
		this.slobs.muteMic( false );
		this.slobs.setSubtitleVisibility( true )
		this.slobs.setSongRequestInferNoticeVisibility( false )
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
			fs.writeFile( './assets/slobs/txt/slobs_song_name.txt', this.songName, ( err ) => {
				if ( err ) {
					console.error( err )
					reject( err )
				}
				resolve()
			} )
		} )
	}

	async headbangOnTempo() {
		const tempo = await this.getSongTempo()

		this.headbangInterval = setInterval( () => {
			this.vtsPlugin.triggerHotkey( "Headbang" )
		}, 60000 / tempo )
	}

	async getSongTempo() {
		return new Promise( ( resolve, reject ) => {
			const calcTempo = ( buffer ) => {
				let audioData = [];
				// Take the average of the two channels
				if ( buffer.numberOfChannels == 2 ) {
					const channel1Data = buffer.getChannelData( 0 );
					const channel2Data = buffer.getChannelData( 1 );
					for ( var i = 0; i < channel1Data.length; i++ ) {
						audioData[ i ] = ( channel1Data[ i ] + channel2Data[ i ] ) / 2;
					}
				} else {
					audioData = buffer.getChannelData( 0 );
				}

				const mt = new MusicTempo( audioData );

				resolve( mt.tempo );
			}

			try {
				const data = fs.readFileSync( "src/song-request/htdemucs/base_song/full.wav" );
				const context = new AudioContext();
				context.decodeAudioData( data, calcTempo );
			} catch ( error ) {
				reject( error )
			}
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