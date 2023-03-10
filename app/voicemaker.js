import { exec } from 'child_process'

export class VoiceMakerAPI {
    sayInProcess( message ) {
        exec( `voicemaker say -l fr-FR -v ai3-fr-FR-Emmy -p "8%" "${ message }"`, ( error, stdout, stderr ) => {
            console.log('TTS done.')
        } )
    }
}