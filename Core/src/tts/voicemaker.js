const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )
const SubTitle = require( './subtitle.js' )
const LanguageDetect = require( 'languagedetect' );

class VoiceMakerAPI {
	constructor( openaiClientInstance ) {
		this.openaiClientInstance = openaiClientInstance
		this.voiceMakerEngine = new VoiceMaker()
		this.lngDetector = new LanguageDetect();
		this.subTitleEngine = new SubTitle( 3002 )
		this.subTitleEngine.initServer()
	}

	async runTTS( message ) {
		if ( !message ) {
			throw new Error( 'No message provided.' )
		}
		const voiceMakerRequest = new VoiceMakerRequest( message )
		const detectedLanguage = this.lngDetector.detect( message, 1 )[ 0 ][ 0 ]
		if ( detectedLanguage === 'french' ) {
			voiceMakerRequest.setVoice( "ai3-fr-FR-Emmy" )
			voiceMakerRequest.pitch = "8%"
		} else {
			voiceMakerRequest.setVoice( "ai3-Nova" )
			voiceMakerRequest.pitch = "-2%"
			voiceMakerRequest.speed = "100%"
		}
		voiceMakerRequest.volume = 10
		const outputPath = await this.voiceMakerEngine.getTts( voiceMakerRequest )
		this.subTitleEngine.send( message )
		const vlcProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', outputPath ] )
		vlcProcess.on( 'close', ( code ) => {
			this.openaiClientInstance.isCompletionInProcess = false
			console.log( 'TTS DONE' )
		} )
	}
}

module.exports = VoiceMakerAPI