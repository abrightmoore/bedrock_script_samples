import * as mc from "@minecraft/server";

//  @TheWorldFoundry
//  Run a simulation of Conway's Game of Life in Minecraft Bedrock using blocks in the world
//  Set up the working areas

let field_size = 64;
let field_frames = new Array(2);  // One current displayed frame, one working one. Double-buffered display.
let iteration = 0;
let current_frame = 0, next_frame = 1;
let num_neighbours = 0;
let px, py, cell_state;  // Calculating next cell states
let block, index, block_type;
let field_origin = {x:-500, y:128, z:0}; // TODO: position the field relative to a tagged entity for multiple simulations.
let dimension = mc.world.getDimension("overworld");
let cells = [
				"minecraft:air",
				"minecraft:iron_block",
				"minecraft:glowstone"
];  // Dead,Alive. Avoid lighting updates

for (let i = 0; i<cells.length; i++) {
	cells[i] = mc.BlockPermutation.resolve(cells[i]);  // pre-calculate the block permutation
};

for (let j = 0; j<2; j++) {
	field_frames[j] = new Array(field_size);  // Add # rows
	for (let i = 0; i < field_frames[j].length; i++) {
		field_frames[j][i] = new Array(field_size);  // Add columns to each row
		// Randomise the initial state
		for (let k = 0; k < field_frames[j][i].length; k++) {
			field_frames[j][i][k] = Math.floor(Math.random() * 2) // 0 empty or 1 alive. TODO: Allow pause and build
			// Clear the play zone up front because we're not updating all the blocks every tick
			if (j == 0) {  // Clear out blocks only once on the first loop
				dimension.getBlock( {x: field_origin.x+k, y:field_origin.y+i, z:field_origin.z}).setPermutation(cells[0]);
			}
		}
	}
};


mc.system.runInterval(() => {
  // TODO: Get each tagged player, get its dimension, work with that
	
	current_frame = iteration%2;  // 0 or 1
	next_frame = (iteration+1)%2; // 1 or 0
	iteration += 1;  // Simple frame counter
	//  Scan the current frame to work out what happens to each cell
	// As we prepare the NEXT frame state in the memory buffer, we can push it out to the world to avoid 2xLoops
	for (let y = 0; y < field_frames[current_frame].length; y++) {
		for (let x = 0; x < field_frames[current_frame][y].length; x++) {
			field_frames[next_frame][y][x] = 0;
			cell_state = field_frames[current_frame][y][x];  // Copy for convenience 
			num_neighbours = 0;
			for (let dy = -1; dy < 2; dy++) {
				for (let dx = -1; dx < 2; dx++) {
					px = (x+dx) // %field_size;
					py = (y+dy) // %field_size;
					if ((0 <= px) && (px < field_size) && (0 <= py) && (py < field_size) && !(dx == 0 && dy == 0)) {
						if (field_frames[current_frame][py][px] > 0) {
							num_neighbours += 1;
						}
					}
				}
			}
			if ((num_neighbours < 2) || (num_neighbours > 3) && (cell_state > 0)) {
				field_frames[next_frame][y][x] = 0; // Dead as the dodo
			}
			else if ((num_neighbours == 3) && (cell_state < 1)) {
				field_frames[next_frame][y][x] = 1; // The miracle of nature
			}
			else {
				field_frames[next_frame][y][x] = field_frames[current_frame][y][x]
			}
			// Use the value of the next frame cell to index the block type
			// Now holding a handle on what is in space we can force the block into it
			// For performance improvements, only change blocks that have been changed
			if (true) { //(field_frames[next_frame][y][x] != cell_state) {
				try {
					block = dimension.getBlock( {x: field_origin.x+x, y:field_origin.y+y, z:field_origin.z+iteration}).setPermutation(cells[field_frames[next_frame][y][x]]);
				} catch(error) {
					
				}
			};

		}
	}
},4);