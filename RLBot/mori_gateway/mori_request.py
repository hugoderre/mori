import requests
import random

class MoriRequest:
	def __init__(self) -> None:
		self.url = "http://localhost:3000/custom-prompt"
		pass
	
	def send(self, message: str):
		if random.choice([True, False]): # Avoid spamming to much
			json={
				"type": "RLBot",
				"messages": [
					{"role": "user", "content": message}
				],
				"temperature": 1,
				"max_tokens": 80,
				"system_context": "You are currently practicing Rocket League (reinforcement learning). The next sentences are events in your game, react to them."
			}
			requests.post(self.url, json=json)
	