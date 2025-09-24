/**
 * Utility functions for the Flappy Bird game
 *
 * This file contains helper functions and classes used across the game:
 * - DOM/SVG manipulation (show, hide, bringToForeground, createSvgElement)
 * - Random number generator (pure RNG)
 * - Pipe processing (collision detection, scoring, velocity adjustments)
 * - CSV parsing for pipe data
 */

import { Birb, Constants, Pipe, PipeProcessResult, Viewport } from "./types";

/**
 * Brings an SVG element to the foreground.
 * @param elem SVG element to bring to the foreground
 */
export const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
export const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
export const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
};

/**
 * Creates an SVG element with the given properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
export const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * A random number generator which provides two pure functions
 * `hash` and `scale`. Call `hash` repeatedly to generate the
 * sequence of hashes.
 */
export abstract class RNG {
    private static m = 0x80000000; // 2^31
    private static a = 1103515245;
    private static c = 12345;

    public static hash = (seed: number): number =>
        (RNG.a * seed + RNG.c) % RNG.m;

    public static scale = (hash: number): number =>
        (2 * hash) / (RNG.m - 1) - 1; // in [-1, 1]
}

/**
 * Generate a random velocity adjustment when a collision occurs.
 *
 * - If hitting the top: returns a positive adjustment (knock downward).
 * - If hitting the bottom: returns a negative adjustment (knock upward).
 * - Otherwise (no collision): returns 0.
 *
 * @param velocity - Current bird velocity
 * @param hitTop - Whether collision is at the top of the gap
 * @param hitBottom - Whether collision is at the bottom of the gap
 * @param hasCollision - Whether a collision actually happened
 * @returns A velocity adjustment (number)
 */
export function createRandomVelocity(
    velocity: number = 0,
    hitTop: boolean,
    hitBottom: boolean,
    hasCollision: boolean,
) {
    const hash = RNG.hash(Constants.SEED + velocity);
    const scaled = RNG.scale(hash);
    return hasCollision
        ? hitTop
            ? 5 + ((scaled + 1) / 2) * 5
            : hitBottom
              ? -10 + ((scaled + 1) / 2) * 5
              : 0
        : 0;
}

/**
 * Process a single pipe against the bird's state.
 *
 * Handles:
 * - Collision detection
 * - Score increment when bird passes a pipe
 * - Pipe horizontal movement
 * - Velocity adjustments on collision
 *
 * @param pipe - Pipe to process
 * @param birdX - Bird's horizontal (x) position
 * @param birdVelocity - Bird's vertical velocity
 * @param birdPosition - Bird's vertical (y) position
 * @returns PipeProcessResult (updated pipe with updated collision, score, velocity)
 */
export const processPipe = (
    pipe: Pipe,
    birdX: number,
    birdVelocity: number,
    birdPosition: number,
): PipeProcessResult => {
    // Check if bird is horizontally inside the pipe range
    const inXRange =
        birdX + Birb.WIDTH / 2 > pipe.horizontalPosition &&
        birdX - Birb.WIDTH / 2 < pipe.horizontalPosition + Constants.PIPE_WIDTH;

    // Check if bird is vertically inside the gap
    const inYGap =
        birdPosition > pipe.gapY - pipe.gapHeight / 2 &&
        birdPosition < pipe.gapY + pipe.gapHeight / 2;

    const collided = pipe.collided ?? false;
    const passed = pipe.passed ?? false;

    // Collision detection (each pipe can only collide once)
    const hasCollision = !collided && inXRange && !inYGap;
    const newCollided = collided || hasCollision;

    // Calculate velocity on collision
    const hitTop = hasCollision && birdPosition < pipe.gapY;
    const hitBottom = hasCollision && birdPosition >= pipe.gapY;
    const velocityAdjustment = createRandomVelocity(
        birdVelocity,
        hitTop,
        hitBottom,
        hasCollision,
    );

    // Add score for passing successfully (no points for collisions)
    const hasPassed =
        !passed &&
        !newCollided &&
        pipe.horizontalPosition + Constants.PIPE_WIDTH < birdX;
    const newPassed = passed || hasPassed;
    const scoreIncrease = hasPassed ? 1 : 0;

    return {
        pipe: {
            ...pipe,
            collided: newCollided,
            passed: newPassed,
            horizontalPosition: pipe.horizontalPosition - Constants.PIPE_SPEED,
        },
        hitPipe: hasCollision,
        scoreIncrease,
        velocityAdjustment,
    };
};

/**
 * Aggregate multiple pipe processing results into one summary.
 *
 * @param results - Array of individual PipeProcessResult
 * @returns Aggregated values:
 *   - hitPipe: whether any collision occurred
 *   - totalScoreIncrease: sum of all score increases
 *   - pipeVelocityAdjustment: sum of all velocity adjustments
 */
export const aggregatePipeResults = (results: PipeProcessResult[]) => ({
    // Check if current tick has pipe be collided
    hitPipe: results.some(result => result.hitPipe),
    // Get the total score increase in current tick
    totalScoreIncrease: results.reduce(
        (sum, result) => sum + result.scoreIncrease,
        0,
    ),
    // Get the total velocity adjustment in current tick
    pipeVelocityAdjustment: results.reduce(
        (sum, result) => sum + result.velocityAdjustment,
        0,
    ),
});

/**
 * Parse a single CSV line into a Pipe object.
 *
 * Expected CSV format: "gap_y_frac,gap_height_frac,time_sec"
 * - gap_y_frac: vertical position (fraction of canvas height)
 * - gap_height_frac: gap size (fraction of canvas height)
 * - time_sec: spawn time in seconds
 *
 * @param line - One CSV line
 * @param idx - Line index
 * @returns Pipe object
 */
export const parsePipeLine = (line: string): Pipe => {
    const [gap_y_frac, gap_height_frac, time_sec] = line.split(",").map(Number);

    return {
        horizontalPosition: Viewport.CANVAS_WIDTH,
        gapY: gap_y_frac * Viewport.CANVAS_HEIGHT,
        gapHeight: gap_height_frac * Viewport.CANVAS_HEIGHT,
        time: time_sec * 1000,
        collided: false,
        passed: false,
    } as Pipe;
};
