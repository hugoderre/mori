const fs = require( 'fs' )
const util = require( 'util' )
const { getDateISO } = require( './utils' )

class CompletionLogger {
    constructor() {
        this.logFile = fs.createWriteStream( `./data/completion${ getDateISO() }.tsv`, { flags: 'w' } )
        this.logFile.write( util.format( "prompt\tcompletion" ) + '\n' );
    }

    writeCompletion( prompt, completion ) {
        this.logFile.write( util.format( prompt + '\t' + completion ) + '\n' );
    }
}

module.exports = CompletionLogger