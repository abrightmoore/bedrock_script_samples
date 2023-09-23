import * as mc from "@minecraft/server";

//  @TheWorldFoundry
//  Run a simulation of Conway's Game of Life in Minecraft Bedrock using blocks in the world
//  Set up the working areas

let field_size = 32;
let field_frames = new Array(2);  // One current displayed frame, one working one. Double-buffered display.
let iteration = 0;
let current_frame = 0, next_frame = 1;
let num_neighbours = 0;
let px, py, cell_state;  // Calculating next cell states
let block, index, block_type;
let field_origin = {x:0, y:225, z:0}; // TODO: position the field relative to a tagged entity for multiple simulations.
let cells = [
				"minecraft:air",
				"minecraft:glowstone"
];  // Dead,Alive. Avoid lighting updates

for (let j = 0; j<2; j++) {
	field_frames[j] = new Array(field_size);  // Add # rows
	for (let i = 0; i < field_frames[j].length; i++) {
		field_frames[j][i] = new Array(field_size);  // Add columns to each row
		// Randomise the initial state
		for (let k = 0; k < field_frames[j][i].length; k++) {
			field_frames[j][i][k] = Math.floor(Math.random() * 2) // 0 empty or 1 alive. TODO: Allow pause and build
		}
	}
};

mc.system.runInterval(() => {
	let dimension = mc.world.getDimension("overworld");  // TODO: Get each tagged player, get its dimension, work with that
	
	current_frame = iteration%2;  // 0 or 1
	next_frame = (iteration+1)%2; // 1 or 0
	iteration += 1;  // Simple frame counter
	//  Scan the current frame to work out what happens to each cell
	// As we prepare the NEXT frame state in the memory buffer, we can push it out to the world to avoid 2xLoops
	for (let y = 0; y < field_frames[current_frame].length; y++) {
		for (let x = 0; x < field_frames[current_frame][y].length; x++) {
			// field_frames[next_frame][y][x] = field_frames[current_frame][y][x];  // Clear ready for editing
			cell_state = field_frames[current_frame][y][x];  // Copy for convenience 
			num_neighbours = 0;
			for (let dy = -1; dy < 2; dy++) {
				for (let dx = -1; dx < 2; dx++) {
					px = x+dx;
					py = y+dy;
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
			block = dimension.getBlock( {x: field_origin.x+x, y:field_origin.y+y, z:field_origin.z});
			// Now holding a handle on what is in space we can force the block into it
			index = field_frames[next_frame][y][x]
			block_type = cells[index]
			block.setPermutation(mc.BlockPermutation.resolve(block_type));
		}
	}
},4)
