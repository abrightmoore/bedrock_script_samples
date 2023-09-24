import * as mc from "@minecraft/server";

// @TheWorldFoundry

/*
	Play progresses until there are three pieces in a row of the same type.
*/


// Game tiles
let dimension = mc.world.getDimension("overworld");
let tiles_strings = [
				"minecraft:red_wool",    // Noughts 0
				"minecraft:cyan_wool",   // Crosses 1
				"minecraft:black_wool",   // Gridlines 2
				"minecraft:sea_lantern",   // Board back 3
				"minecraft:air"           // Empty 4
			];
let tiles = new Array(tiles_strings.length)
for (let i = 0; i<tiles_strings.length; i++) {
	tiles[i] = mc.BlockPermutation.resolve(tiles_strings[i]);  // pre-calculate the block permutation
};

// Board layout
let board_origin = {x:0, y:180, z:0};
let board_size = 7;
for (let y = 0; y < board_size; y++) {
	for (let x = 0; x < board_size; x++) {
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y+y, z:board_origin.z}).setPermutation(tiles[3]);
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y+y, z:board_origin.z+1}).setPermutation(tiles[4]);
		
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y+2, z:board_origin.z}).setPermutation(tiles[2]);
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y+4, z:board_origin.z}).setPermutation(tiles[2]);
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y, z:board_origin.z}).setPermutation(tiles[2]);
		dimension.getBlock( {x: board_origin.x+x, y:board_origin.y+board_size-1, z:board_origin.z}).setPermutation(tiles[2]);
	}
	dimension.getBlock( {x: board_origin.x+2, y:board_origin.y+y, z:board_origin.z}).setPermutation(tiles[2]);
	dimension.getBlock( {x: board_origin.x+4, y:board_origin.y+y, z:board_origin.z}).setPermutation(tiles[2]);
	dimension.getBlock( {x: board_origin.x, y:board_origin.y+y, z:board_origin.z}).setPermutation(tiles[2]);
	dimension.getBlock( {x: board_origin.x+board_size-1, y:board_origin.y+y, z:board_origin.z}).setPermutation(tiles[2]);
}

// Initial instructions
mc.world.sendMessage("USE  RED WOOL FOR NOUGHTS: O")
mc.world.sendMessage("USE CYAN WOOL FOR CROSSES: X")
mc.world.sendMessage("GAME ON!")

mc.system.runInterval(() => {
	//  Read the board from the world into an array so we can check for win conditions
	let board_noughts = [
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[0])
		],
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[0])
		],
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[0]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[0])
		]
	];
	
	let board_crosses = [
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+5, z:board_origin.z+1}).permutation.matches(tiles_strings[1])
		],
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+3, z:board_origin.z+1}).permutation.matches(tiles_strings[1])
		],
		[
			dimension.getBlock( {x: board_origin.x+1, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+3, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[1]),
			dimension.getBlock( {x: board_origin.x+5, y:board_origin.y+1, z:board_origin.z+1}).permutation.matches(tiles_strings[1])
		]
	];
	
	//  Check the board to see if we have a winner.
	//  We are looking for three in a row
	let board = board_noughts;
	
	// mc.world.sendMessage("Board:"+JSON.stringify(board))
	if ( ((board[0][0] == true) && (board[0][0] == board[1][0]) && (board[1][0] == board[2][0])) ||  // Horizontal
		 ((board[0][1] == true) && (board[0][1] == board[1][1]) && (board[1][1] == board[2][1])) ||
		 ((board[0][2] == true) && (board[0][2] == board[1][2]) && (board[1][2] == board[2][2])) ||
		 ((board[0][0] == true) && (board[0][0] == board[0][1]) && (board[0][1] == board[0][2])) ||  // Vertical
		 ((board[1][0] == true) && (board[1][0] == board[1][1]) && (board[1][1] == board[1][2])) ||
		 ((board[2][0] == true) && (board[2][0] == board[2][1]) && (board[2][1] == board[2][2])) ||
		 ((board[0][0] == true) && (board[0][0] == board[1][1]) && (board[1][1] == board[2][2])) ||  // Diagonal
		 ((board[0][2] == true) && (board[0][2] == board[1][1]) && (board[1][1] == board[2][0]))
		) {
		mc.world.sendMessage("NOUGHTS IS THE WINNER!")
	};

	board = board_crosses;
	if ( ((board[0][0] == true) && (board[0][0] == board[1][0]) && (board[1][0] == board[2][0])) ||  // Horizontal
		 ((board[0][1] == true) && (board[0][1] == board[1][1]) && (board[1][1] == board[2][1])) ||
		 ((board[0][2] == true) && (board[0][2] == board[1][2]) && (board[1][2] == board[2][2])) ||
		 ((board[0][0] == true) && (board[0][0] == board[0][1]) && (board[0][1] == board[0][2])) ||  // Vertical
		 ((board[1][0] == true) && (board[1][0] == board[1][1]) && (board[1][1] == board[1][2])) ||
		 ((board[2][0] == true) && (board[2][0] == board[2][1]) && (board[2][1] == board[2][2])) ||
		 ((board[0][0] == true) && (board[0][0] == board[1][1]) && (board[1][1] == board[2][2])) ||  // Diagonal
		 ((board[0][2] == true) && (board[0][2] == board[1][1]) && (board[1][1] == board[2][0]))		) {
		mc.world.sendMessage("CROSSES IS THE WINNER!")
	};
	
},17)
