const { spawn } = require( 'node:child_process' )

class VoiceMakerAPI {
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
            console.log( `TTS done with code ${ code }.` );
        } );
    }
}

module.exports = VoiceMakerAPI