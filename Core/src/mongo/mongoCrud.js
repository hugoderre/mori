const { MongoClient, ServerApiVersion } = require( 'mongodb' )
const dotenv = require( 'dotenv' )
dotenv.config()

class MongoCrud {
	constructor() {
		this.client = null
	}

	async initClient() {
		const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/?retryWrites=true&w=majority`
		this.client = new MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 } )
		try {
			await this.client.connect()
		} catch ( error ) {
			console.error( 'Error connecting to MongoDB Atlas:', error )
		}
	}

	async insertDocument( collectionName, document ) {
		await this.client.db( process.env.MONGODB_DBNAME ).collection( collectionName ).insertOne( document )
	}

	async upsertDocument( collectionName, filter, update ) {
		await this.client.db( process.env.MONGODB_DBNAME ).collection( collectionName ).updateOne(
			filter,
			update,
			{
				upsert: true,
			}
		)
	}

	async findDocument( collectionName, filter ) {
		return await this.client.db( process.env.MONGODB_DBNAME ).collection( collectionName ).findOne( filter )
	}

	async findAllDocuments( collectionName ) {
		const cursor = this.client.db( process.env.MONGODB_DBNAME ).collection( collectionName ).find()
		return await cursor.toArray()
	}
}

module.exports = MongoCrud