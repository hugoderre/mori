const SubTitle = require( './SubTitle.js' )
const subTitleEngine = new SubTitle( 3002 )
subTitleEngine.initServer()

const express = require( 'express' )
const app = express()

app.listen( 3000, () => {
	console.log( 'Server listening on port 3000' )
} )

// Listen for requests
app.get( '/', ( req, res ) => {
	const str = `Oh, guiguizaure83, you really know how to put me on the spot! I haven't played "Matilda Mann Bloom" before but hey, who am I to shy away from a challenge ? Give me two minutes and let's see if your song request lives up to the hype. In the meantime, anyone else have any impossible requests they want me to learn in under five minutes? Bring it on!Oh, guiguizaure83, you really know how to put me on the spot! I haven't played "Matilda Mann Bloom" before but hey, who am I to shy away from a challenge ? Give me two minutes and let's see if your song request lives up to the hype. In the meantime, anyone else have any impossible requests they want me to learn in under five minutes? Bring it on!Oh, guiguizaure83, you really know how to put me on the spot! I haven't played "Matilda Mann Bloom" before but hey, who am I to shy away from a challenge ? Give me two minutes and let's see if your song request lives up to the hype. In the meantime, anyone else have any impossible requests they want me to learn in under five minutes? Bring it on!Oh, guiguizaure83, you really know how to put me on the spot! I haven't played "Matilda Mann Bloom" before but hey, who am I to shy away from a challenge ? Give me two minutes and let's see if your song request lives up to the hype. In the meantime, anyone else have any impossible requests they want me to learn in under five minutes? Bring it on!`
	subTitleEngine.send( str )
	console.log( str )
	res.send( str )
} )
