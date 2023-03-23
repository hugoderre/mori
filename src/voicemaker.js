const fs = require( 'fs' )
const { spawn } = require( 'node:child_process' )
const { VoiceMaker, VoiceMakerRequest } = require( 'voicemaker' )

class VoiceMakerAPI {
	constructor( openaiClientInstance ) {
		this.openaiClientInstance = openaiClientInstance
		this.voiceMakerEngine = new VoiceMaker()
	}

	async runTTS( message ) {
		if ( !message ) {
			throw new Error( 'No message provided.' )
		}
		const voiceMakerRequest = new VoiceMakerRequest( message )
		voiceMakerRequest.setVoice( "ai3-fr-FR-Emmy" )
		voiceMakerRequest.pitch = "8%"
		voiceMakerRequest.volume = 10
		const outputPath = await this.voiceMakerEngine.getTts( voiceMakerRequest )
		this.subTitleTTS( message )
		const vlcProcess = spawn( 'vlc', [ '--intf', 'dummy', '--no-video', '--play-and-exit', outputPath ] )
		vlcProcess.on( 'close', ( code ) => {
			this.openaiClientInstance.isCompletionInProcess = false
			console.log( 'TTS DONE' )
		} )
	}

	subTitleTTS( message ) {
		const dir = './tmp'

		if ( !fs.existsSync( dir ) ) {
			fs.mkdirSync( dir );
		}

		const filePath = dir + '/tts-subtitle.txt'

		const words = message.split( ' ' )

		let wordIndex = 0
		const interval = setInterval( () => {
			if ( wordIndex < words.length ) {
				const word = words[ wordIndex ]

				if ( wordIndex === 0 ) {
					fs.writeFileSync( filePath, word, 'utf8' )
				} else {
					fs.appendFileSync( filePath, ' ' + word, 'utf8' )
				}

				wordIndex++
			} else {
				clearInterval( interval )
				setTimeout( () => fs.writeFileSync( filePath, '', 'utf8' ), 7000 )
			}
		}, 200 )
	}
}

module.exports = VoiceMakerAPI