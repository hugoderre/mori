import numpy as np
from rlgym.utils.reward_functions.common_rewards.misc_rewards import EventReward
from rlgym.utils.gamestates import GameState, PlayerData
from rlgym.utils.common_values import BLUE_TEAM, BLUE_GOAL_BACK, ORANGE_GOAL_BACK, ORANGE_TEAM, BALL_MAX_SPEED, \
    CAR_MAX_SPEED
    
from mori_gateway.mori_request import MoriRequest
mori_request = MoriRequest()

class CustomEventReward(EventReward):
	def get_reward(self, player: PlayerData, state: GameState, previous_action: np.ndarray, optional_data=None):
		old_values = self.last_registered_values[player.car_id]
		new_values = self._extract_values(player, state)

		diff_values = new_values - old_values
		diff_values[diff_values < 0] = 0  # We only care about increasing values
		
		if (diff_values[1] != 0 and player.team_num == BLUE_TEAM):
			mori_request.send("You scored a goal. React narcissistically.")
			pass

		if (diff_values[2] != 0 and player.team_num == BLUE_TEAM):
			mori_request.send("Your opponent has scored a goal. React in a sarcastic way.")
			pass

		# if (diff_values[5] != 0 and player.team_num == BLUE_TEAM):
		# 	mori_request.send("You stopped a shot. React narcissistically.")
   
		# if (diff_values[5] != 0 and player.team_num == ORANGE_TEAM):
		# 	mori_request.send("Your opponent stopped your shot. React in bad faith.")
   
		if (diff_values[6] != 0 and player.team_num == BLUE_TEAM):
			mori_request.send("You blew up your opponent's car. React by making fun of him.")
   
		return super().get_reward(player, state, previous_action, optional_data)
