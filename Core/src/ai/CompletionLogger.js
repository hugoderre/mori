const fs = require( 'fs' )
const util = require( 'util' )
const { getDateISO } = require( '../utils' )

class CompletionLogger {
	constructor() {
		this.logFile = this.initLogFile()
	}

	initLogFile() {
		const logDir = './data/completions';
		const logFilePath = `${logDir}/completion${getDateISO()}.tsv`;

		if ( !fs.existsSync( logDir ) ) {
			fs.mkdirSync( logDir );
		}

		const logFile = fs.createWriteStream( logFilePath, { flags: 'a' } )

		// Write log file header text if empty
		logFile.on( 'open', () => {
			fs.stat( logFilePath, ( err, stats ) => {
				if ( err ) {
					console.error( err );
					return;
				}
				const fileSize = stats.size;
				if ( fileSize === 0 ) {
					logFile.write( util.format( 'prompt\tcompletion' ) + '\n' );
				}
			} );
		} );

		return logFile
	}

	writeCompletion( prompt, completion ) {
		this.logFile.write( util.format( prompt + '\t' + completion ) + '\n' );
	}
}

module.exports = CompletionLogger