import requests

class MoriRequest:
	def __init__(self) -> None:
		self.url = "http://localhost:3000/rlbot-prompt"
		pass
	
	def send(self, message: str):
		json={
      		"type": "RLBot",
			"messages": [
       			{"role": "user", "content": message}
          	],
   			"temperature": 1,
			"max_tokens": 80,
		}
		requests.post(self.url, json=json)
	