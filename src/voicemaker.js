const { spawn } = require( 'node:child_process' )

class VoiceMakerAPI {
    constructor(openaiClientInstance) {
        this.openaiClientInstance = openaiClientInstance
    }

    sayInProcess( message ) {
        const args = [
            'say',
            '-l',
            'fr-FR',
            '-v',
            'ai3-fr-FR-Emmy',
            '-p',
            '8%',
            message
        ];
        const voicemaker = spawn( 'voicemaker', args );

        voicemaker.on( 'error', ( err ) => {
            console.error( `Failed to start voicemaker: ${ err }` );
        } );
        voicemaker.on( 'close', ( code ) => {
            this.openaiClientInstance.isCompletionInProcess = false
            console.log( `TTS done with code ${ code }.` );
        } );
    }
}

module.exports = VoiceMakerAPI