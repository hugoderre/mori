const express = require( 'express' )
const bodyParser = require( 'body-parser' )
const expressApp = express()
const App = require( './src/app.js' )

expressApp.listen( 3000, () => console.log( 'Listen 3000' ) )
expressApp.use( bodyParser.json() );

new App( expressApp )