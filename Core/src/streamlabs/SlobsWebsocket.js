const WebSocket = require( 'ws' )
const dotenv = require( 'dotenv' )
dotenv.config()

class SlobsWebsocket {
	constructor() {
		this.ws = new WebSocket( 'ws://192.168.1.13:59650/api/websocket' )
		this.init()
	}

	async init() {
		try {
			this.auth()
		} catch ( error ) {
			console.error( error )
		}
	}

	async auth() {
		return new Promise( ( resolve, reject ) => {
			this.ws.on( 'open', () => {
				const authRequest = {
					jsonrpc: '2.0',
					id: 8,
					method: 'auth',
					params: {
						resource: 'TcpServerService',
						args: [ process.env.SLOBS_TOKEN ]
					}
				}
				this.ws.send( JSON.stringify( authRequest ) )
			} )

			this.ws.once( 'message', ( data ) => {
				const message = JSON.parse( data )
				if ( message.error ) {
					throw new Error( message.error.message )
				}
				resolve()
			} )

			this.ws.on( 'close', () => {
				console.warn( 'WebSocket connection closed' )
			} )
		} )
	}

	getListAudioSources() {
		const getListAudioSourcesRequest = {
			"jsonrpc": "2.0",
			"id": 7,
			"method": "getSourcesForCurrentScene",
			"params": {
				"resource": "AudioService"
			}
		}
		this.ws.send( JSON.stringify( getListAudioSourcesRequest ) )
	}

	muteMic( isMuted ) {
		const muteMicRequest = {
			"jsonrpc": "2.0",
			"id": 7,
			"method": "setMuted",
			"params": {
				"resource": "AudioSource[\"wasapi_input_capture_547d3dbe-8b76-4d26-bf68-9c2b63a46e13\"]",
				"args": [ isMuted ]
			}
		}
		this.ws.send( JSON.stringify( muteMicRequest ) )
	}

	getActiveScene() {
		const getActiveSceneRequest = {
			"jsonrpc": "2.0",
			"id": 8,
			"method": "activeScene",
			"params": {
				"resource": "ScenesService"
			}
		}
		this.ws.send( JSON.stringify( getActiveSceneRequest ) )
	}

	setSongRequestInferNoticeVisibility( isVisible ) {
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"61813109-6119-4522-851a-b89f019fe4f4\", \"text_gdiplus_e572282e-c380-4274-8a8e-4a6172bd326c\"]",
			isVisible
		)
	}

	setSongNameVisibility( isVisible ) {
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"d58402d9-27f2-4450-a5f6-ea147ceda93f\", \"text_gdiplus_811fbaea-5f31-4f21-826b-954b11c3c954\"]",
			isVisible
		)
	}

	setSubtitleVisibility( isVisible ) {
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"a160f1c4-f98e-44e9-8101-ada16d090def\", \"browser_source_f7dfc909-ca56-4573-9634-4f4953098677\"]",
			isVisible
		)
	}

	setChevaletVisibility( isVisible ) {
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"c0cf5d57-8eb2-402a-b4f9-4722cd9c03b8\", \"image_source_f6827531-bd37-46fe-b1d3-46919c0c0866\"]",
			isVisible
		)
	}

	setPaintingCompletedVisibility( isVisible ) {
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"345b717d-6155-446d-b556-f179f8366055\", \"image_source_86bdf888-2864-4446-b06c-c232ff2d3a17\"]",
			isVisible
		)
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"bdd196a6-bf54-477f-a358-50f5c4126712\", \"image_source_d0dd37ec-d7a6-436e-b0f3-cd5cb115105f\"]",
			isVisible
		)
		this.setItemVisibility(
			"SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"77a0260d-0238-4fd4-a7c5-a7e8cc92fc70\", \"image_source_7147b62e-ca43-4fee-92d9-5da678364a7e\"]",
			isVisible
		)
	}

	setItemVisibility( resource, isVisible ) {
		const setItemVisibilityRequest = {
			"jsonrpc": "2.0",
			"id": 10,
			"method": "setVisibility",
			"params": {
				"resource": resource,
				"args": [ isVisible ]
			}
		}
		this.ws.send( JSON.stringify( setItemVisibilityRequest ) )
	}

	async startRecording() {
		return await this.recordingRequest( 'start' )
	}

	async stopRecording() {
		return await this.recordingRequest( 'stop' )
	}

	async recordingRequest( action ) {
		return new Promise( ( resolve, reject ) => {
			const request = {
				jsonrpc: '2.0',
				id: 1,
				method: action + 'Recording',
				params: {
					resource: 'StreamingService'
				}
			}
			this.ws.send( JSON.stringify( request ) )

			this.ws.once( 'message', ( data ) => {
				resolve()
			} )
		} )
	}
}

module.exports = SlobsWebsocket