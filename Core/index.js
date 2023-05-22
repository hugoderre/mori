const express = require( 'express' )
const bodyParser = require( 'body-parser' )
const expressApp = express()
const App = require( './src/App.js' )

expressApp.listen( 3000, () => console.log( 'Listen 3000' ) )
expressApp.use( bodyParser.json() );

const app = new App( expressApp )

if ( process.argv.includes( '-d' ) ) {
	app.discordBotStandalone()
} else {
	app.init()
}