const path = require( 'path' )
const fs = require( 'fs' )
const axios = require( 'axios' )

class Bot {
	static sendFileToChannel( command, filePath, message = '' ) {
		const fileAbsPath = path.resolve( filePath )

		if ( !fs.existsSync( fileAbsPath ) ) {
			console.error( 'DiscordBot.sendFileToChannel: file not found' )
			return
		}

		axios.post( 'http://localhost:6969/dc-bot-api', {
			"command": command,
			"content": {
				"file_path": fileAbsPath,
				"message_content": message,
				"thread_name": "#12 Stream 20/05/2023"
			}
		} ).then( ( response ) => {
			console.log( response.data )
		} ).catch( ( error ) => {
			console.error( error )
		} )
	}

	static sendSongRequestVideoToChannel( command, filePath, songName = '' ) {
		if ( !fs.existsSync( filePath ) ) {
			throw new Error( 'DiscordBot.sendSongRequestVideoToChannel: file not found' )
		}

		const tmpFolderPath = path.resolve( './tmp' )
		if ( !fs.existsSync( tmpFolderPath ) ) {
			fs.mkdirSync( tmpFolderPath )
		}

		// Compress video
		const ffmpeg = require( 'fluent-ffmpeg' )
		const videoPath = path.resolve( filePath )
		const videoName = path.basename( videoPath )
		const videoNameWithoutExt = videoName.split( '.' )[ 0 ]
		const videoCompressedPath = path.resolve( `./tmp/${videoNameWithoutExt}.mp4` )

		ffmpeg( videoPath )
			.videoCodec( 'libx264' )
			.audioCodec( 'copy' )
			.outputOptions( [
				'-preset veryfast',
				'-movflags +faststart',
				'-pix_fmt yuv420p',
				'-crf 36',
				'-r 30',
				'-g 60',
				'-keyint_min 60',
				'-sc_threshold 0',
				'-b:a 128k',
				'-ac 2',
			] )
			.on( 'error', function ( err ) {
				console.error( 'An error occurred: ' + err.message )
			} )
			.on( 'end', function () {
				DiscordBot.sendFileToChannel( command, videoCompressedPath, songName )
				console.log( 'Song request video compressed and sent' )
			} )
			.save( videoCompressedPath )
	}
}

module.exports = { Bot }