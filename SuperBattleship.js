/* SuperBattleship
 * The game object. 
 *
 * custom_options parameter can be used to change game characteristics away from default
 * Beware that no validity check is done on values set by custom options.
 * Options that can be customized:
 *    boardSize : default is 50. Must be positive. Beware of making it too small, 
 *                otherwise player fleet's won't fit and/or board set up will 
 *                get caught in inifinite loop.
 *    fleet : An array of objects that describe the ships in a fleet. Each object
 *            must provide a string field "name" for the name of the ship and an
 *            positive integer field "size" for the size of the ship. Size should be
 *            relatively small compared to boardSize. Name should be unique.
 *    missAge : The number of turns a miss will remain on the board before disappearing.
 *              Multiple misses on the same square will accumulate this value.
 *    turnLimit : The number of turns before a draw is declared.
 *    rotateMissLimit : The number of misses a ship can rotate through.
 *    rearViewDistance : The number of squares behind that a ship can see.
 * 
 * 
 */

var SuperBattleship = function (custom_options) {
    // makeKey
    // Need to define this private function first in order to
    // create the game key.
    var makeKey = function(len) {
	var key = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	for (var i=0; i<len; i++) {
	    key += possible.charAt(Math.floor(Math.random()*possible.length));
	}
	return key;
    };
    
    // Private fields
    
    var options = {
	fleet : [{name: "Carrier",
		  size: 5},
		 {name: "Battleship",
		  size: 4},
		 {name: "Cruiser",
		  size: 3},
		 {name: "Submarine",
		  size: 3},
		 {name: "Destroyer",
		  size: 2}],
	boardSize: 50,
	missAge: 10,
	turnLimit: 2000,
	rotateMissLimit: 3,
	rearViewDistance: 2
    }

    if (custom_options != null) {
	for (var key in custom_options) {
	    options[key] = custom_options[key];
	}
    }
    
    var status = SBConstants.REGISTERING_PLAYERS;
    var p1_key = null;
    var p2_key = null;
    
    var game_key = makeKey(10);

    var registeredEventHandlers = {};
    var active_misses = [];
    
    var player_one_fleet = [];
    var player_two_fleet = [];

    var turn_count = 0;
    
    // Private methods

    // The following line captures the value of this (i.e.,
    // a reference to the game object) as the local
    // variable that. Makes it possible for private
    // methods which may be called in a way where "this" is
    // not defined as the game object to have access to the
    // game object via the closure.
    
    var that = this;

    var fireEvent = function (e) {
	// If the game is over, don't generate events.
	if (that.status == SBConstants.FINISHED) {
	    return;
	}

	// If this is the game over event, update the
	// game status to be FINISHED
	if (e.event_type == SBConstants.GAME_OVER_EVENT) {
	    that.status = SBConstants.FINISHED;
	}
	
	// A bit of a hack to add a game property
	// to every event that is fired without having to
	// remember to build it into the definition of each event type.
	e.game = that;

	// Call all registered handlers for the event type if any.
	var handlers = registeredEventHandlers[e.event_type];
	if (handlers != null) {
	    for (var i=0; i<handlers.length; i++) {
		handlers[i](e);
	    }
	}

	// Call all handlers registered for ALL_EVENTS
	handlers = registeredEventHandlers[SBConstants.ALL_EVENTS];
	if (handlers != null) {
	    for (var i=0; i<handlers.length; i++) {
		handlers[i](e);
	    }
	}
    }

    var setupBoard = function () {
	var max_ship_size = 0;
	options.fleet.forEach(function (si) {if (si.size > max_ship_size) max_ship_size = si.size;});
	
	var half_max = Math.floor(max_ship_size/2.0+0.5);
	var half_board = options.boardSize/2;
	
	var p1_init_area = {
	    left: half_max,
	    right: Math.floor(half_board - half_max),
	    top: 0,
	    bottom: options.boardSize-1
	};
	
	var p2_init_area = {
	    left: Math.ceil(half_board + half_max),
	    right: options.boardSize-1-half_max,
	    top: 0,
	    bottom: options.boardSize-1
	};
	
	var pickInitialPosition = function(area, key, fleet, size) {
	    // WARNING: this algorithm may get stuck in an
	    // infinite loop if the area is small relative to max ship size
	    // and/or there are too many ships in the fleet.
	    var directions = [SBConstants.NORTH, SBConstants.SOUTH,
			      SBConstants.EAST, SBConstants.WEST];

	    var is_valid = false;
	    
	    while(!is_valid) {
		var x = Math.floor(Math.random()*(area.right-area.left+1))+area.left;
		var y = Math.floor(Math.random()*(area.bottom-area.top+1))+area.top;
		var dir = directions[Math.floor(Math.random()*4)];
		var dx = SBConstants.dxByDir(dir);
		var dy = SBConstants.dyByDir(dir);
		
		segment_check: {
		    for (var seg=0; seg<size; seg++) {
			var cx = x + dx*seg;
			var cy = y + dy*seg;

			cx = normX(cx);
			cy = normY(cy);
			
			if (cx < area.left || cx > area.right ||
			    cy < area.top || cy > area.bottom ||
			    findShipInFleetAtCoordinate(key, fleet, cx, cy) != null) {
			    break segment_check;
			}
		    }
		    is_valid = true;
		}
	    }
	    
	    return {x: x, y: y, direction: dir}
	};

	options.fleet.forEach(function (si) {
	    // Find a spot to place each ship in each
	    // player's initial area.
	    
	    var pos = pickInitialPosition(p1_init_area,
					  p1_key, player_one_fleet, si.size);
	    player_one_fleet.push(new Ship(si.name, si.size, pos, p1_key, that));
	    
	    pos = pickInitialPosition(p2_init_area,
				      p2_key, player_two_fleet, si.size);
	    player_two_fleet.push(new Ship(si.name, si.size, pos, p2_key, that));
	});
    };

    var findShipInFleetAtCoordinate = function(key, fleet, x, y) {
	for (var i=0; i<fleet.length; i++) {
	    var ship = fleet[i];
	    if (ship.occupies(key, x, y)) {
		return ship;
	    }
	}
	return null;
    };

    var visibleToFleet = function(key, fleet, x, y) {
	for (var i=0; i<fleet.length; i++) {
	    var ship = fleet[i];
	    if (ship.canSee(key, x, y)) {
		return true;
	    }
	}
	return false;
    };

    var switchTurns = function () {
	if (status == SBConstants.REGISTERING_PLAYERS ||
	    status == SBConstants.FINISHED) {
	    return;
	}
	
	if (status == SBConstants.PLAYER_ONE) {
	    status = SBConstants.PLAYER_TWO;
	} else {
	    status = SBConstants.PLAYER_ONE;
	}

	turn_count++;

	if (turn_count == options.turnLimit) {
	    fireEvent(new GameOverEvent(SBConstants.DRAW));
	    return;
	}

	var non_expiring_misses = [];
	active_misses.forEach(function(am) {
	    if (am.expiration >= turn_count) {
		non_expiring_misses.push(am);
	    }
	});
	active_misses = non_expiring_misses;
	
	fireEvent(new TurnChangeEvent(status));	
    };

    var normX = function(x) {return ((x%options.boardSize)+options.boardSize)%options.boardSize;};
    var normY = function(y) {return ((y%options.boardSize)+options.boardSize)%options.boardSize;};

    var moveShip = function(key, ship, distance) {
	if (status == SBConstants.REGISTERING_PLAYERS ||
	    status == SBConstants.FINISHED) {
	    return false;
	}

	// Is it this person's turn?
	if ((key != p1_key) && (key != p2_key)) {
	    return false;
	}
	if ((key == p1_key) && status != SBConstants.PLAYER_ONE) {
	    return false;
	}
	if ((key == p2_key) && status != SBConstants.PLAYER_TWO) {
	    return false;
	}

	// Is it this person's ship?
	var pos = ship.getPosition(key);
	if (pos == null) {
	    return false;
	}

	// Is the ship dead?
	if (ship.getStatus() == SBConstants.DEAD) {
	    return false;
	}
	
	// Is the square needed to move into empty?
	// Also, calculate new position for head of ship
	
	var new_pos_x = pos.x;
	var new_pos_y = pos.y;
	var sqr_x = pos.x;
	var sqr_y = pos.y;
	var size_adjust = 0;
	if (distance < 0) { // If moving backward, adjust for size of ship.
	    size_adjust = ship.getSize() - 1;
	}
	
	switch (pos.direction) {
	case SBConstants.NORTH:
	    sqr_y -= distance + size_adjust;
	    new_pos_y -= distance;
	    break;
	case SBConstants.SOUTH:
	    sqr_y += distance - size_adjust;
	    new_pos_y += distance;
	    break;
	case SBConstants.EAST:
	    sqr_x += distance - size_adjust;
	    new_pos_x += distance;
	    break;
	case SBConstants.WEST:
	    sqr_x -= distance + size_adjust;
	    new_pos_x -= distance;
	    break;
	}
	sqr_x = normX(sqr_x);
	sqr_y = normY(sqr_y);

	var loc = that.queryLocation(key, sqr_x, sqr_y);
	if (loc.type != "empty") {
	    return false;
	}

	// All looks good, move ship
	new_pos_x = normX(new_pos_x);
	new_pos_y = normY(new_pos_y);
	ship.setShipLocation(game_key, new_pos_x, new_pos_y);

	// Switch turns
	switchTurns();
	return true;
    }

    var rotateShip = function(key, ship, is_cw) {
	if (status == SBConstants.REGISTERING_PLAYERS ||
	    status == SBConstants.FINISHED) {
	    return false;
	}

	// Is it this person's turn?
	if ((key != p1_key) && (key != p2_key)) {
	    return false;
	}
	if ((key == p1_key) && status != SBConstants.PLAYER_ONE) {
	    return false;
	}
	if ((key == p2_key) && status != SBConstants.PLAYER_TWO) {
	    return false;
	}

	// Is it this person's ship?
	var pos = ship.getPosition(key);
	if (pos == null) {
	    return false;
	}

	// Are the squares we need to rotate through empty?
	// The following algorithm generates the appropriate
	// square coordinates to rotate through
	// as if the ship were positioned at 0,0 and facing north.
	// Then each coordinate is translated and rotated according
	// to the ship's actual position and direction to check
	// the actual squares needed.
	// The transform function below does the necessary math
	// on the values of tx and ty captured by the closure
	var transform = function() {
	    var rotateAxisCW = function() {
		var ny = tx;  var nx = -ty;
		tx = nx; ty = ny;
	    };

	    // Rotate from north to actual direction of ship
	    switch(pos.direction) {
	    case SBConstants.WEST:
		rotateAxisCW();
	    case SBConstants.SOUTH:
		rotateAxisCW();
	    case SBConstants.EAST:
		rotateAxisCW();
	    }

	    // Translate to ship's position
	    tx += pos.x;
	    ty += pos.y;

	    // Normalize
	    tx = normX(tx);
	    ty = normY(ty);
	};
	
	var size = ship.getSize();
	var miss_count = 0;
	
	for (var gy=0; gy<size; gy++) {
	    for (var gx=1; gx<size; gx++) {
		var tx = is_cw ? -gx : gx; // Check the other side if clockwise
		var ty = gy;
		transform(); // Does the transform math on tx and ty

		var sqr = that.queryLocation(key, tx, ty);
		if (sqr.type != "empty") {
		    if ((sqr.type == "miss") && (gy != 0)) {
			// The gy check above prevents ship from ending up on a miss square.
			miss_count += 1;
			if (miss_count > options.rotateMissLimit) {
			    return false; // Too many active misses in the way
			}
		    } else {
			return false; // Something is in the way
		    }
		}
	    }
	}
	// Nothing preventing the rotation.
	var new_dir = is_cw ?
	    SBConstants.nextDirCW(pos.direction) :
	    SBConstants.nextDirCCW(pos.direction);

	ship.setShipDirection(game_key, new_dir);
	switchTurns();
	return true;
    };
    
    // Public methods that require
    // access to private fields and methods

    this.isKey = function(k) {return k == game_key;};
    this.isPlayerOneKey = function(k) {return k == p1_key;};
    this.isPlayerTwoKey = function(k) {return k == p1_key;};

    this.getStatus = function() {return status;};
    this.getBoardSize = function() {return options.boardSize;};
    this.normalizeX = function(x) {return normX(x);};
    this.normalizeY = function(y) {return normY(y);};
    this.getTurnCount = function() {return turn_count;};
    this.getTurnLimit = function() {return options.turnLimit;};
    this.getRearViewDistance = function() {return options.rearViewDistance;}
    
    this.registerPlayerOne = function() {
	if (p1_key != null) {
	    return false; // Already have a player one registered
	}
	
	p1_key = makeKey(10);
	return p1_key;
    }
    
    this.registerPlayerTwo = function() {
	if (p2_key != null) {
	    return false; //Already have a player two registered
	}

	p2_key = makeKey(10);
	return p2_key;
    }
    
    this.startGame = function() {
	if (status != SBConstants.REGISTERING_PLAYERS ||
	    p1_key == null ||
	    p2_key == null) {
	    return false;
	}
	
	setupBoard();
	
	status = SBConstants.PLAYER_ONE;
	fireEvent(new TurnChangeEvent(SBConstants.PLAYER_ONE));
	return true;
    }
    
    this.registerEventHandler = function(event_type, handler) {
	if (registeredEventHandlers[event_type] == null) {
	    registeredEventHandlers[event_type] = new Array();
	}
	registeredEventHandlers[event_type].push(handler);
    }

    this.getPlayerOneFleet = function() {
	return player_one_fleet.slice(0);
    }

    this.getPlayerTwoFleet = function() {
	return player_two_fleet.slice(0);
    }

    this.getFleetByKey = function(key) {
	if (key == p1_key) {
	    return this.getPlayerOneFleet();
	} else if (key == p2_key) {
	    return this.getPlayerTwoFleet();
	}
	return null;
    };
	
    this.shootAt = function(player_key, x, y) {
	if (status == SBConstants.REGISTERING_PLAYERS ||
	    status == SBConstants.FINISHED) {
	    return false;
	}

	if ((player_key != p1_key) && (player_key != p2_key)) {
	    return false;
	}
	if ((player_key == p1_key) && status != SBConstants.PLAYER_ONE) {
	    return false;
	}
	if ((player_key == p2_key) && status != SBConstants.PLAYER_TWO) {
	    return false;
	}

	x = normX(x);
	y = normY(y);
	
	// First see if we hit something. If so, generate a hit event
	var ship_hit = findShipInFleetAtCoordinate(p1_key, player_one_fleet, x, y);
	if (ship_hit == null) {
	    ship_hit = findShipInFleetAtCoordinate(p2_key, player_two_fleet, x, y);
	}
	if (ship_hit != null) {
	    ship_hit.registerHit(game_key, x, y);
	    fireEvent(new HitEvent(ship_hit, x, y));
	    if (ship_hit.getStatus() == SBConstants.DEAD) {
		fireEvent(new ShipSunkEvent(ship_hit));
		// Check to see if all ships have been hit.
		if (ship_hit.getOwner() == SBConstants.PLAYER_ONE) {
		    var alive = player_one_fleet.find(function (s) {
			return s.getStatus() == SBConstants.ALIVE;
		    });
		    if (alive == undefined) {
			// All player one ships are dead.
			// Declare player two the winner.
			fireEvent(new GameOverEvent(SBConstants.PLAYER_TWO));
		    }
		} else {
		    alive = player_two_fleet.find(function (s) {
			return s.getStatus() == SBConstants.ALIVE;
		    });
		    if (alive == undefined) {
			// All player two ships are dead.
			// Declare one the winner.
			fireEvent(new GameOverEvent(SBConstants.PLAYER_ONE));
		    }
		}
	    }
	} else {	    
	    // Otherwise, generate miss event.

	    // First, see if we have an active miss event at that position
	    // and if so, advance its expiration.
	    var miss_info = null;
	    active_misses.forEach(function (am) {
		if (am.x == x && am.y == y) {
		    am.expiration += options.missAge;
		    miss_info = am;
		}
	    });

	    if (miss_info == null) { // No active miss there, so create a new one.
		miss_info = {x: x, y: y, expiration: this.getTurnCount() + options.missAge};
		active_misses.push(miss_info);
	    }

	    fireEvent(new MissEvent(miss_info));
	}
	switchTurns();	
	return true;
    }

    this.moveShipForward = function(key, ship) {
	return moveShip(key, ship, 1);
    }

    this.moveShipBackward = function (key, ship) {
	return moveShip(key, ship, -1);
    }

    this.rotateShipCW = function(key, ship) {
	return rotateShip(key, ship, true);
    }

    this.rotateShipCCW = function(key, ship) {
	return rotateShip(key, ship, false);
    }

    this.getShipByName = function (key, ship_name) {
	if (key == p1_key) {
	    return player_one_fleet.find(function(s) {return s.getName() == ship_name;});
	} else if (key == p2_key) {
	    return player_two_fleet.find(function(s) {return s.getName() == ship_name;});
	}
	return null;
    }
    
    this.queryLocation = function(key, x, y) {
	var loc_info = null;
	var always_visible = false;
	
	// First see if it is an active miss
	var miss_info = null;
	x = normX(x);
	y = normY(y);
	active_misses.forEach(function (am) {
	    if (am.x == x && am.y == y) {
		miss_info = am;
	    }
	});

	if (miss_info != null) {
	    // It's a miss
	    loc_info = {type: "miss", expires: miss_info.expiration};
	    always_visible = true;
	} else {
	    // Not a miss, let's check for a ship.

	    var ship = findShipInFleetAtCoordinate(p1_key, player_one_fleet, x, y);
	    var ship_owner = "p1";
	    if (ship == null) {
		ship = findShipInFleetAtCoordinate(p2_key, player_two_fleet, x, y);
		ship_owner = "p2";
	    }
	    if (ship != null) {
		// It's a ship
		var seg_idx = ship.lookupSegmentIndex(game_key, x, y);
		var seg_state = ship.getSegmentState(game_key, seg_idx);
		loc_info = {type: ship_owner,
			    ship: ship,
			    segment: seg_idx,
			    state: seg_state};
		always_visible = (ship.getStatus() == SBConstants.DEAD); // Dead ships always visible.
	    } else {
		// Not a ship either, must be empty.
		loc_info = {type: "empty"};
	    }
	}

	if (always_visible ||
	    ((key == p1_key) && visibleToFleet(key, player_one_fleet, x, y)) ||
	    ((key == p2_key) && visibleToFleet(key, player_two_fleet, x, y))) {
	    return loc_info;
	} else {
	    return {type: "invisible"};
	}
    };
}

var TurnChangeEvent = function(whose_turn) {
    this.event_type = SBConstants.TURN_CHANGE_EVENT;
    this.who = whose_turn;
};

var HitEvent = function(ship, x, y) {
    this.event_type = SBConstants.HIT_EVENT;
    this.ship = ship;
    this.x = x;
    this.y = y;
}

var MissEvent = function(miss_info) {
    this.event_type = SBConstants.MISS_EVENT;
    this.x = miss_info.x;
    this.y = miss_info.y;
    this.expiration = miss_info.expiration;
}

var ShipSunkEvent = function(ship) {
    this.event_type = SBConstants.SHIP_SUNK_EVENT;
    this.ship = ship;
}

var GameOverEvent = function(winner) {
    this.event_type = SBConstants.GAME_OVER_EVENT;
    this.winner = winner;
}

var Ship = function(name, size, position, key, game) {	       
    var segment_status = [];
    for (var i=0; i<size; i++) {
	segment_status[i] = SBConstants.OK;
    }

    // Methods only availabe to the game object
    // and require the game key.
    
    this.lookupSegmentIndex = function (gk, x,y) {
	if (!game.isKey(gk)) {return;}
	
	x = game.normalizeX(x);
	y = game.normalizeY(y);

	switch(position.direction) {
	case SBConstants.NORTH:
	    if (x != position.x) {return -1;}
	    if (y < position.y) {y += game.getBoardSize();} // Straddling
	    var seg_idx = (y-position.y);
	    break;
	case SBConstants.SOUTH:
	    if (x != position.x) {return -1;}
	    if (y > position.y) {y -= game.getBoardSize();} // Straddling
	    var seg_idx = (position.y-y);
	    break;
	case SBConstants.WEST:
	    if (y != position.y) {return -1;}
	    if (x < position.x) {x += game.getBoardSize();} // Straddling
	    var seg_idx = (x-position.x);
	    break;
	case SBConstants.EAST:
	    if (y != position.y) {return -1;}
	    if (x > position.x) {x -= game.getBoardSize();} // Straddling
	    var seg_idx = (position.x-x);
	    break;
	}
	if (seg_idx >= size || seg_idx < 0) {return -1;}
	return seg_idx;
    };

        this.setShipLocation = function(gk, x, y) {
	if (game.isKey(gk)) {
	    position.x = game.normalizeX(x);
	    position.y = game.normalizeY(y);
	}
    };

    this.setShipDirection = function(gk, new_dir) {
	if (game.isKey(gk)) {
	    position.direction = new_dir;
	}
    }
    
    this.registerHit = function(gk, x, y) {
	if (!game.isKey(gk)) {return;}
	var seg_idx = this.lookupSegmentIndex(gk, x,y);
	if (seg_idx != -1) {
	    segment_status[seg_idx] = SBConstants.BURNT;
	}
    };

    this.getSegmentState = function(gk, seg_idx) {
	if (!game.isKey(gk)) {return;}
	return segment_status[seg_idx];
    };

    // Owner's public methods - require the player key associated with the ship

    this.getPosition = function(k) {
	if (k == key || this.getStatus() == SBConstants.DEAD) {
	    return position;
	}
	return null;
    }
    
    this.occupies = function(k, x, y) {
	if (key != k) return undefined;
	
	x = game.normalizeX(x);
	y = game.normalizeY(y);

	for (var i=0; i<size; i++) {
	    var cx = game.normalizeX(position.x + i * SBConstants.dxByDir(position.direction));
	    var cy = game.normalizeY(position.y + i * SBConstants.dyByDir(position.direction));

	    if (cx == x && cy == y) {
		return true;
	    }
	}
	return false;
    };


    this.canSee = function(k, x, y) {
	if (key != k) return undefined;

	x = game.normalizeX(x);
	y = game.normalizeY(y);

	var rotateAxisCCW = function() {
	    var ny = -x;  var nx = y;
	    x = nx; y = ny;
	}

	// Translate as if ship position is
	// at the origin.
	x -= position.x;
	y -= position.y;

	// Rotate as if ship pointing north
	switch(position.direction) {
	case SBConstants.WEST:
	    rotateAxisCCW();
	case SBConstants.SOUTH:
	    rotateAxisCCW();
	case SBConstants.EAST:
	    rotateAxisCCW();
	}

	var distance_ahead = -1;
	var distance_behind = -1;
	var distance_left = -1;
	var distance_right = -1;
	
	if (y < 0) {
	    distance_ahead = -y;
	} else if (y > size-1) {
	    distance_behind = y-size+1;
	} else {
	    distance_ahead = 0;
	    distance_behind = 0;
	}

	if (x < 0) {
	    distance_left = -x;
	} else if (x > 0) {
	    distance_right = x;
	} else {
	    distance_left = 0;
	    distance_right = 0;
	}

	if (distance_ahead == -1) {
	    distance_ahead = game.getBoardSize() - distance_behind - size + 1;
	} else if (distance_behind == -1) {
	    distance_behind = game.getBoardSize() - distance_ahead - size + 1;
	}
	if (distance_right == -1) {
	    distance_right = game.getBoardSize() - distance_left;
	} else if (distance_left == -1) {
	    distance_left = game.getBoardSize() - distance_right;
	}

	return ((distance_ahead <= size && (distance_left <= size || distance_right <= size)) ||
		(distance_behind <= game.getRearViewDistance() && (distance_left <= size || distance_right <= size)));
    };

    // Generally public methods - does not require the player key associated with ship
    
    this.getName = function() {return name;}

    this.getSize = function() {return size;}

    this.getOwner = function() {
	if (game.isPlayerOneKey(key)) {
	    return SBConstants.PLAYER_ONE;
	} else if (game.isPlayerTwoKey(key)) {
	    return SBConstants.PLAYER_TWO;
	}
	return null;
    }

    // isMine tests a key for being the key associated with the ship.
    this.isMine = function(k) {return (key == k);};

    this.getStatus = function() {
	return (segment_status.find(function (s) {return s == SBConstants.OK;}) == undefined ?
		SBConstants.DEAD : SBConstants.ALIVE);
    }
};