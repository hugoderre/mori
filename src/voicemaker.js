const { exec } = require( 'node:child_process' )

class VoiceMakerAPI {
    sayInProcess( message ) {
        exec( `voicemaker say -l fr-FR -v ai3-fr-FR-Emmy -p "8%" "${ message }"`, ( error, stdout, stderr ) => {
            console.log( 'TTS done.' )
        } )
    }
}

module.exports = VoiceMakerAPI