const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )
const SubTitle = require( './SubTitle.js' )

class VoiceMakerClient {
	constructor( openaiClientInstance ) {
		this.openaiClientInstance = openaiClientInstance
		this.voiceMakerEngine = new VoiceMaker()
		this.subTitleEngine = new SubTitle( 3002 )
		this.subTitleEngine.initServer()
	}

	async runTTS( message ) {
		return new Promise( async ( resolve, reject ) => {
			if ( !message ) {
				return reject( 'No message provided.' )
			}

			let voiceMakerRequest;
			try {
				voiceMakerRequest = new VoiceMakerRequest( message )
			} catch ( error ) {
				console.error( 'Error creating VoiceMakerRequest with message:', message )
				return reject( error )
			}

			voiceMakerRequest.setVoice( "ai3-Nova" )
			voiceMakerRequest.pitch = 16
			voiceMakerRequest.volume = 10

			let outputPath;
			try {
				outputPath = await this.voiceMakerEngine.getTts( voiceMakerRequest )
			} catch ( error ) {
				console.error( 'Error getting TTS with voiceMakerRequest' )
				return reject( error )
			}

			this.subTitleEngine.send( message )
			const vlcProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', outputPath ] )
			vlcProcess.on( 'close', ( code ) => {
				console.log( 'TTS DONE' )
				resolve()
			} )
		} )
	}
}

module.exports = VoiceMakerClient