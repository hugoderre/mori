function getDateISO() {
	let yourDate = new Date()
	yourDate.toISOString().split( '.' )[ 0 ]
	const offset = yourDate.getTimezoneOffset()
	yourDate = new Date( yourDate.getTime() - ( offset * 60 * 1000 ) )

	return yourDate.toISOString().split( 'T' )[ 0 ]
}

function escapeSpecialChars( str ) {
	const regex = new RegExp( /[A-Za-z0-9+-éèàùâûê%ç&*@ô)(\/\\=:?!'" ]/, 'gm' )
	const strMatches = str.match( regex )

	return strMatches ? strMatches.join( '' ) : ''
}

module.exports = { getDateISO, escapeSpecialChars }