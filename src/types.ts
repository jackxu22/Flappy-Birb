/**
 * Common types and constants for the Flappy Bird game.
 *
 * This file defines the core data structures used to represent:
 * - The viewport (canvas)
 * - The bird
 * - Pipes
 * - The overall game state
 *
 * It also provides initial values for the game state.
 */

/** Canvas dimensions */
export const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

/** Bird sprite dimensions */
export const Birb = {
    WIDTH: 42,
    HEIGHT: 30,
} as const;

/** Physics and game constants */
export const Constants = {
    PIPE_WIDTH: 50,
    TICK_RATE_MS: 16,
    GRAVITY: 0.4,
    PIPE_SPEED: 3,
    STRENGTH: -7,
    SEED: 1234,
    COLLISION_VELOCITY_DOWN: 5,
    COLLISION_VELOCITY_UP: -5,
} as const;

/** User input types */
export type Key = "Space";

/** Game entity types */
export type Bird = {
    verticalPosition: number;
    verticalVelocity: number;
};

export type Pipe = Readonly<{
    horizontalPosition: number;
    gapY: number;
    gapHeight: number;
    time: number;
    collided: boolean;
    passed: boolean;
}>;

/** Main game state */
export type State = Readonly<{
    bird: Bird;
    pipes: Pipe[];
    score: number;
    lives: number;
    gameEnd: boolean;
    gameTime: number;
    gameStarted: boolean;
}>;

/** Initial bird state */
export const initialBird: Bird = {
    verticalPosition: Viewport.CANVAS_HEIGHT / 2,
    verticalVelocity: 0,
};

/** Initial full game state */
export const initialState: State = {
    bird: initialBird,
    pipes: [],
    score: 0,
    lives: 3,
    gameEnd: false,
    gameTime: 0,
    gameStarted: false,
};

/** Result of processing a single pipe against the bird state */
export interface PipeProcessResult {
    pipe: Pipe;
    hitPipe: boolean;
    scoreIncrease: number;
    velocityAdjustment: number;
}
