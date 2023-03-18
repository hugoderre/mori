const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )

class VoiceMakerAPI {
	constructor( openaiClientInstance ) {
		this.openaiClientInstance = openaiClientInstance
		this.voiceMakerEngine = new VoiceMaker()
	}

	async runTTS( message ) {
		if ( !message ) {
			this.openaiClientInstance.isCompletionInProcess = false
			return
		}
		const voiceMakerRequest = new VoiceMakerRequest( message )
		voiceMakerRequest.setVoice( "ai3-fr-FR-Emmy" )
		voiceMakerRequest.pitch = "8%"
		voiceMakerRequest.volume = 10
		const outputPath = await this.voiceMakerEngine.getTts( voiceMakerRequest )
		const vlcProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', outputPath ] )
		vlcProcess.on( 'close', ( code ) => {
			this.openaiClientInstance.isCompletionInProcess = false
			console.log( 'TTS DONE' )
		} )
	}
}

module.exports = VoiceMakerAPI