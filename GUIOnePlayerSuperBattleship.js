$(document).ready(function () {
    var game = new SuperBattleship();
    var cli_player_one = new GUIPlayer(game, $('#log_output'), $('#p1_view'), true);
    var ai_player_two = new DumbAI(game, false);
    game.startGame();
});