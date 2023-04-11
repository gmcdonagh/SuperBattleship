var DumbAI = function(game, is_player_one, delay) {
    if (is_player_one) {
	var key = game.registerPlayerOne();
    } else {
	key = game.registerPlayerTwo();
    }

    var turn_delay = 0;
    if (delay != undefined) {
	turn_delay = delay;
    }
    
    var eventHandler = function(e) {
	switch (e.event_type) {
	case SBConstants.TURN_CHANGE_EVENT:
	    if (((e.who == SBConstants.PLAYER_ONE) && is_player_one) ||
		((e.who == SBConstants.PLAYER_TWO) && (!is_player_one))) {
		{
		    var x = Math.floor(Math.random() * game.getBoardSize());
		    var y = Math.floor(Math.random() * game.getBoardSize());
		    setTimeout(function () {game.shootAt(key, x, y);}, turn_delay);
		}
	    }
	}
    }

    game.registerEventHandler(SBConstants.TURN_CHANGE_EVENT,
			      eventHandler);

    this.giveUpKey = function() {
	return key;
    }
	
}