class PromptQueue {
	constructor() {
		this.queue = {
			low: [],
			medium: [],
			high: [],
			veryhigh: []
		}
		this.queueIntervalRef = null
		this.secondsSinceLastDispatchedPrompt = 0
	}

	add( prompt, priority ) {
		this.queue[ priority ].push( prompt )
		console.log( this.queue )
	}

	reset() {
		this.queue = {
			low: [],
			medium: [],
			high: [],
			veryhigh: []
		}
	}

	softReset() {
		this.queue.medium = []
		this.queue.low = []
	}

	isQueueEmpty() {
		for ( const priority in this.queue ) {
			if ( this.queue[ priority ].length > 0 ) {
				return
			}
		}
		return true
	}

	async dispatch( modules ) {
		const priorities = [ 'veryhigh', 'high', 'medium', 'low' ]
		this.secondsSinceLastDispatchedPrompt++
		for ( const priority of priorities ) {
			if ( modules.llm && this.isQueueEmpty() && this.secondsSinceLastDispatchedPrompt > 18 ) {
				modules.llm.queueUpRandomPrompt()
				break
			}
			if ( !this.queue[ priority ][ 0 ] ) {
				continue
			}

			const prompt = this.queue[ priority ].pop()
			await modules[ prompt.module ].runProcess( prompt )
			this.secondsSinceLastDispatchedPrompt = 0
		}
		await new Promise( resolve => setTimeout( resolve, 1000 ) );
		this.dispatch( modules )
	}
}

module.exports = PromptQueue