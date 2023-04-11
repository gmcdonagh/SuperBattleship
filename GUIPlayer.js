var GUIPlayer = function (game, cli_output, map, is_player_one)
{
    if (is_player_one)
	{
		var key = game.registerPlayerOne();
	} 

	else 
	{
		key = game.registerPlayerTwo();
	}
    
	cli_output = $(cli_output);
	map = $(map);
	
	var eventLogHandler = function(e) 
    {
	   var cli_msg = $('<div class="cli_msg"></div>');
	
	   switch (e.event_type) 
       {
	       case SBConstants.TURN_CHANGE_EVENT:
	           if (e.who == SBConstants.PLAYER_ONE) 
               {
		          cli_msg.text("Player one's turn (count = " + game.getTurnCount() + ")");
	           } 
               
               else 
               {
		          cli_msg.text("Player two's turn (count = " + game.getTurnCount() + ")");
	           }
	           break;
               
	       case SBConstants.MISS_EVENT:
	           cli_msg.text("Miss event at (" + e.x + ", " + e.y + ")");
	           break;
               
	       case SBConstants.HIT_EVENT:
	           cli_msg.text("Hit event at (" + e.x + ", " + e.y + ")");
	           break;
               
	       case SBConstants.SHIP_SUNK_EVENT:
	           var ship = e.ship;
	           if (ship.isMine(key)) 
               {
		          var pos = ship.getPosition(key);
		          cli_msg.text("Foe sunk your " + ship.getName() + " at (" + pos.x + ", " + pos.y + ")");
	           } 
               
               else 
               {
		          var pos = ship.getPosition(null); // This works because ship is dead.
		          cli_msg.text("You sunk their " + ship.getName() + " at (" + pos.x + ", " + pos.y + ")");
	           }
	           break;
	   }
        
	cli_output.prepend(cli_msg);
    };

    game.registerEventHandler(SBConstants.TURN_CHANGE_EVENT, eventLogHandler);
    game.registerEventHandler(SBConstants.MISS_EVENT, eventLogHandler);
    game.registerEventHandler(SBConstants.HIT_EVENT, eventLogHandler);
    game.registerEventHandler(SBConstants.SHIP_SUNK_EVENT, eventLogHandler);
    
    
    var gameOverHandler = function(e)
    {
        var over_msg = "";
        if (is_player_one && e.winner == SBConstants.PLAYER_ONE) 
        {
            over_msg = ("Game over. You win!");
	    } 
               
        else if (e.winner == SBConstants.DRAW) 
        {
            over_msg = ("Draw!");
	    }
               
        else
        {
            over_msg = ("Game over. You lose!");
        }
        $("body").empty();
        $("body").append("<div><h1>" + over_msg + "</h1</div>");
        
        
    };
    
       
    game.registerEventHandler(SBConstants.GAME_OVER_EVENT, gameOverHandler);
    
    
    var mapDrawHandler = function(e)
    { 
        map.empty();
        var map_table = $("<table id=map tabindex=1></table>");
        var map_str = "";
        for(i=0; i < 51; i++)
        {  
            map_str += ("<tr>");
            for (j=0; j < 51; j++)
            {
                if(i == 0)
                {
                    if (j == 0)
                    {
                        map_str += ("<td></td>");
                    }
                    
                    else
                    {
                        map_str += ("<td>" + (j-1) + "</td>");
                    }
                }
                
                else
                {
                    if (j == 0)
                    {
                        map_str += ("<td>" + (i-1) + "</td>");
                    }
                    
                    else
                    {
                        var sqr = game.queryLocation(key, j-1,i-1);
                        switch(sqr.type)
                        {
                            case "miss":
                            {
                                map_str += ("<td class = miss></td>");
                                break;
                            }
                            case "p1":
                            {
                                if(sqr.state == SBConstants.OK)
                                {
                                    map_str += ("<td class = player></td>");
                                    break; 
                                }
                                else
                                {
                                    map_str += ("<td class = burnt></td>");
                                    break;
                                }   
                            }
                            case "p2":
                            {
                                if(sqr.state == SBConstants.OK)
                                {
                                    map_str += ("<td class = enemy></td>");
                                    break; 
                                }
                                else
                                {
                                    map_str += ("<td class = burnt></td>");
                                    break;
                                }   
                            }
                            case "empty":
                            {
                                map_str += ("<td class = empty></td>");
                                break;
                            }
                            case "invisible":
                            {
                                map_str += ("<td class = invisible></td>");
                                break;
                            }
                        }       
                    }
                }
            }    
            map_str += ("</tr>");
        }
        map.append(map_table.append(map_str));
        $("td").click(controller);
    };
    
    game.registerEventHandler(SBConstants.TURN_CHANGE_EVENT, mapDrawHandler);
    
    var visible = false;
    
    var clear_info = function()
    {
        $("#fleet_info_output").empty();
    }
    
    game.registerEventHandler(SBConstants.TURN_CHANGE_EVENT, clear_info);
    
    $("#fleet_info_button").on("click", function()
    {
        if (!visible)
        {
            $("#fleet_info_output").empty();
            var fleet = game.getFleetByKey(key);
            var fleet_ul = $('<ol></ol>');
            fleet.forEach(function (s) 
            {
                var ship_str = "<li>" + s.getName();
                var ship_pos = s.getPosition(key);
                ship_str += "<ul>";
                ship_str += "<li>Position: " + ship_pos.x + ", " + ship_pos.y + "</li>";
                ship_str += "<li>Direction: " + ship_pos.direction + "</li>";
                ship_str += "<li>Size: " + s.getSize() + "</li>";
                if (s.getStatus() == SBConstants.ALIVE) 
                {
                    ship_str += "<li>Status: ALIVE</li>";
                } 
                else 
                {
                    ship_str += "<li>Status: DEAD</li>";
                }
                ship_str += "</ul></li>";
                fleet_ul.append(ship_str);
            })
            
            $("#fleet_info_output").append(fleet_ul);
            visible = true;
        }
        
        else
        {
            $("#fleet_info_output").empty();
            visible = false;
        }
    })
    
    var controller = function(e)
    {
        var not_moved = true;
        $(document).off("keypress");
        mapDrawHandler();
        var x = $(e.target).index() - 1;
        var y =$(this).parent().parent().children().index($(this).parent()) - 1;
        var sqr = game.queryLocation(key,x,y);
        if (sqr.type == "p1")
        {
            var ship = sqr.ship;
            var size = ship.getSize();
            var ship_position = ship.getPosition(key);
            for (i=0; i < size; i++)
            {
                
                if(ship_position.direction == "north" && ship.getStatus() != SBConstants.DEAD)
                {
                    var row_pos = ship_position.y+i+1;
                    var col_pos = ship_position.x+1;
                    if(row_pos > 50)
                    {
                        row_pos = (50-row_pos)*(-1);
                    }
                    if(row_pos < 1)
                    {
                        row_pos = (50+row_pos);
                    }
                    var cell = document.getElementById('map').rows[row_pos].cells[col_pos];
                    $(cell).removeClass();
                    $(cell).addClass("selected");
                }
                
                if(ship_position.direction == "south" && ship.getStatus() != SBConstants.DEAD)
                {
                    var row_pos = ship_position.y-i+1;
                    var col_pos = ship_position.x+1;
                    if(row_pos > 50)
                    {
                        row_pos = (50-row_pos)*(-1);
                    }
                    if(row_pos < 1)
                    {
                        row_pos = (50+row_pos);
                    }
                    var cell = document.getElementById('map').rows[row_pos].cells[col_pos];
                    $(cell).removeClass();
                    $(cell).addClass("selected");
                }
                
                if(ship_position.direction == "west" && ship.getStatus() != SBConstants.DEAD)
                {
                    var row_pos = ship_position.y+1;
                    var col_pos = ship_position.x+i+1;
                    if(col_pos > 50)
                    {
                        col_pos = (50-col_pos)*(-1);
                    }
                    if(col_pos < 1)
                    {
                        col_pos = (50+col_pos);
                    }
                    var cell = document.getElementById('map').rows[row_pos].cells[col_pos];
                    $(cell).removeClass();
                    $(cell).addClass("selected");
                }
                
                if(ship_position.direction == "east" && ship.getStatus() != SBConstants.DEAD)
                {
                    var row_pos = ship_position.y+1;
                    var col_pos = ship_position.x-i+1;
                    if(col_pos > 50)
                    {
                        col_pos = (50-col_pos)*(-1);
                    }
                    if(col_pos < 1)
                    {
                        col_pos = (50+col_pos);
                    }
                    var cell = document.getElementById('map').rows[row_pos].cells[col_pos];
                    $(cell).removeClass();
                    $(cell).addClass("selected");
                } 
            } 
            
            $(document).on("keypress", function (e)
            {    
                if(e.which == 119)
                {
                    game.moveShipForward(key, ship);
                    not_moved = false;
                }
                    
                if(e.which == 115)
                {
                    game.moveShipBackward(key, ship);
                    not_moved = false;
                }
                        
                if(e.which == 97 && ship.getStatus() != SBConstants.DEAD)
                {
                    game.rotateShipCCW(key, ship);
                    not_moved = false;
                }
                     
                if(e.which == 100 && ship.getStatus() != SBConstants.DEAD)
                {
                    game.rotateShipCW(key, ship);
                    not_moved = false;
                }
                
                if(e.which == 107 && ship.getStatus() != SBConstants.DEAD && not_moved && sqr.state == SBConstants.OK)
                {
                    game.shootAt(key, x,y);
                }
                    
            }) 
            
        }
        
        else if (x>= 0 && x<= 50 && y >=0 && y<=50 && sqr.state != SBConstants.BURNT)
        {
            game.shootAt(key, x, y);
        }
    };
};