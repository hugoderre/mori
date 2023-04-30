const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )
const SubTitle = require( './subtitle.js' )

class VoiceMakerAPI {
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
				console.log( 'Error creating VoiceMakerRequest with message:', message )
				return reject( error )
			}

			voiceMakerRequest.setVoice( "ai3-Nova" )
			voiceMakerRequest.pitch = "8%"
			voiceMakerRequest.speed = "100%"
			voiceMakerRequest.volume = 10

			let outputPath;
			try {
				outputPath = await this.voiceMakerEngine.getTts( voiceMakerRequest )
			} catch ( error ) {
				console.log( 'Error getting TTS with voiceMakerRequest' )
				return reject( error )
			}

			this.subTitleEngine.send( message )
			const vlcProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', outputPath ] )
			vlcProcess.on( 'close', ( code ) => {
				this.openaiClientInstance.isMoriSpeaking = false
				console.log( 'TTS DONE' )
				resolve()
			} )
		} )
	}
}

module.exports = VoiceMakerAPI