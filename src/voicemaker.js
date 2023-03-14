const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )
require( 'console.mute' )

class VoiceMakerAPI {
	constructor( openaiClientInstance ) {
		this.openaiClientInstance = openaiClientInstance
		this.engine = new VoiceMaker()
	}

	async sayInProcess( message ) {
		const request = new VoiceMakerRequest( message )
		request.setVoice( "ai3-fr-FR-Emmy" )
		request.pitch = "8%"
		request.volume = 10
		console.mute()
		await this.engine.say( request )
		console.resume()
		this.openaiClientInstance.isCompletionInProcess = false
	}
}

module.exports = VoiceMakerAPI