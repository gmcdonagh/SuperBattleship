/* SBConstants
   A global object with field names for symbolic 
   contants used in the game.

   Actual values may be changed in future versions so no meaning should
   be given to the integer values used here.

   The two methods dxByDir and dyByDir will return the appropriate change in x or y
   necessary to go from the head of a ship (i.e., it's position) toward the back
   of a ship depending on what direction it is facing. The game object needs this method
   but you might find it handy too (for example, if you need to process all of the locations
   occupied by a ship and you need to appropriate advance a for loop). The value returned is
   either 1, 0, or -1.

   The two methods nextDirCW and nextDirCCW will return the next direction either clockwise
   our counter-clockwise from the direction provided as a parameter.
*/

var SBConstants = {
    REGISTERING_PLAYERS: 0,
    PLAYER_ONE: 1,
    PLAYER_TWO: 2,
    FINISHED: 3,

    DRAW: 4,
    
    TURN_CHANGE_EVENT: 0,
    HIT_EVENT: 1,
    MISS_EVENT: 2,
    SHIP_SUNK_EVENT: 3,
    GAME_OVER_EVENT: 4,

    ALL_EVENTS: 5,
    
    NORTH: "north",
    SOUTH: "south",
    EAST: "east",
    WEST: "west",

    OK: 0,
    BURNT: 1,

    ALIVE: 0,
    DEAD: 1
};

SBConstants.dxByDir = function(dir) {
    switch (dir) {
    case SBConstants.NORTH:
    case SBConstants.SOUTH: return 0;
    case SBConstants.EAST: return -1;
    case SBConstants.WEST: return 1;
    }
    return null; // Should never happen.
}

SBConstants.dyByDir = function(dir) {
    switch (dir) {
    case SBConstants.NORTH: return 1;
    case SBConstants.SOUTH: return -1;
    case SBConstants.EAST:
    case SBConstants.WEST: return 0;
    }
    return null; // Should never happen.
}

SBConstants.nextDirCW = function(dir) {
    switch(dir) {
    case SBConstants.NORTH: return SBConstants.EAST; 
    case SBConstants.SOUTH: return SBConstants.WEST;
    case SBConstants.EAST: return SBConstants.SOUTH;
    case SBConstants.WEST: return SBConstants.NORTH;
    }
}

SBConstants.nextDirCCW = function(dir) {
    switch(dir) {
    case SBConstants.NORTH: return SBConstants.WEST; 
    case SBConstants.SOUTH: return SBConstants.EAST;
    case SBConstants.EAST: return SBConstants.NORTH;
    case SBConstants.WEST: return SBConstants.SOUTH;
    }
}