/**
 * Game state update and transformation logic for the Flappy Bird game.
 *
 * This defines the core mechanics that advance the game state on each tick
 * (frame) and handle player interactions (such as jumping).
 */

import { State, Bird, Constants, Viewport } from "./types";
import {
    aggregatePipeResults,
    createRandomVelocity,
    processPipe,
} from "./util";

/**
 * Advances the game state by one tick (time step).
 *
 * This function handles:
 * 1. Applying gravity to the bird's velocity and updating its position.
 * 2. Moving pipes across the screen and filtering out off-screen pipes.
 * 3. Detecting collisions with pipes or screen boundaries.
 * 4. Awarding points when pipes are successfully passed.
 * 5. Updating lives and determining if the game has ended.
 *
 * Each pipe tracks whether it has already been passed or collided,
 * ensuring scoring and collisions are only counted once.
 *
 * @param s The current game state.
 * @returns The updated game state after one tick.
 */
export const tick = (s: State): State => {
    // If the game has already ended, return the state unchanged
    if (s.gameEnd) return s;

    /** 1. Update bird's position and velocity */
    const newVelocity = s.bird.verticalVelocity + Constants.GRAVITY;
    const newPosition = s.bird.verticalPosition + newVelocity;
    const birdX = Viewport.CANVAS_WIDTH * 0.3;

    /** 2. Process all pipes and collect results */
    const pipeResults = s.pipes.map(pipe =>
        processPipe(pipe, birdX, newVelocity, newPosition),
    );
    // Keep only pipes that are still visible on the screen
    const newPipes = pipeResults
        .map(result => result.pipe)
        .filter(p => p.horizontalPosition + Constants.PIPE_WIDTH > 0);

    /** 3. Combine results from all pipes */
    const { hitPipe, totalScoreIncrease, pipeVelocityAdjustment } =
        aggregatePipeResults(pipeResults);

    /** 4. Check for collisions with screen boundaries */
    const hitTop = newPosition <= 0;
    const hitBottom = newPosition >= Viewport.CANVAS_HEIGHT;
    const hasCollision = hitTop || hitBottom;

    /** 5. Adjust velocity when hitting boundaries */
    const boundaryVelocityAdjustment = createRandomVelocity(
        newVelocity,
        hitTop,
        hitBottom,
        hasCollision,
    );

    /** 6. Update remaining lives */
    const hitBoundary = hitTop || hitBottom;
    const loseLife = hitBoundary || hitPipe;
    const newLives = loseLife ? s.lives - 1 : s.lives;

    /** 7. Determine if the game has ended */
    const gameEnd = newLives <= 0 || (s.gameStarted && newPipes.length === 0);

    /** 8. Final bird state after all velocity adjustments */
    const finalVelocity =
        newVelocity + pipeVelocityAdjustment + boundaryVelocityAdjustment;
    const finalPosition = s.bird.verticalPosition + finalVelocity;

    const newBird: Bird = {
        verticalVelocity: finalVelocity,
        verticalPosition: finalPosition,
    };

    /** 9. Return new state */
    return {
        ...s,
        bird: newBird,
        pipes: newPipes,
        lives: newLives,
        gameEnd: gameEnd,
        score: s.score + totalScoreIncrease,
        gameTime: s.gameTime + Constants.TICK_RATE_MS,
    };
};

/**
 * Causes the bird to "jump"
 * by setting its vertical velocity to a fixed upward strength.
 *
 * @param s The current game state.
 * @returns The updated game state with the bird's velocity reset for a jump.
 */
export const jump = (s: State): State => {
    return {
        ...s,
        bird: {
            ...s.bird,
            verticalVelocity: Constants.STRENGTH,
        },
    };
};
