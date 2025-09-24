/**
 * Rendering functions for the Flappy Bird game.
 *
 * This module is responsible for drawing the current game state
 * (bird, pipes, HUD, etc.) onto the SVG canvas.
 *
 * In MVC terms, this acts as the "View" component, reflecting changes in the "Model".
 */

import { State, Viewport, Birb, Constants } from "./types";
import { show, hide, createSvgElement } from "./util";

/**
 * Creates and returns a render function that updates the SVG canvas
 * according to the given game state.
 *
 * @returns A function that takes a `State` and renders it to the DOM.
 */
export const render = (): ((s: State) => void) => {
    // Canvas elements
    const gameOver = document.querySelector("#gameOver") as SVGElement;

    // Text fields
    const livesText = document.querySelector("#livesText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;

    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;

    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    return (s: State) => {
        /** 1. Update HUD elements (Lives and Score) */
        const currentLives = `Lives: ${s.lives}`;
        const currentScore = `Score: ${s.score}`;
        // Only update HUD when necessary
        if (livesText.textContent !== currentLives) {
            livesText.textContent = currentLives;
        }
        if (scoreText.textContent !== currentScore) {
            scoreText.textContent = currentScore;
        }

        /** 2. Show or hide the "Game Over" screen */
        if (s.gameEnd) show(gameOver);
        else hide(gameOver);

        // Skip rendering new elements if the game has ended
        if (s.gameEnd) return;

        /** 3. Remove previous dynamic elements (bird and pipes).
         * Elements with the "dynamic" class are regenerated every frame.
         */
        document.querySelectorAll(".dynamic").forEach(elem => elem.remove());

        /** 4. Render the bird at its current position. */
        const birdImg = createSvgElement(svg.namespaceURI, "image", {
            href: "assets/birb.png",
            x: `${Viewport.CANVAS_WIDTH * 0.3 - Birb.WIDTH / 2}`,
            y: `${s.bird.verticalPosition - Birb.HEIGHT / 2}`,
            width: `${Birb.WIDTH}`,
            height: `${Birb.HEIGHT}`,
            class: "dynamic", // Marks this element as dynamic for future removal
        });
        svg.appendChild(birdImg);

        /** 5. Render pipes */
        s.pipes.forEach(pipe => {
            // Top pipe
            const pipeTop = createSvgElement(svg.namespaceURI, "rect", {
                x: `${pipe.horizontalPosition}`,
                y: "0",
                width: `${Constants.PIPE_WIDTH}`,
                height: `${pipe.gapY - pipe.gapHeight / 2}`,
                fill: "green",
                class: "dynamic",
            });

            // Bottom pipe
            const pipeBottom = createSvgElement(svg.namespaceURI, "rect", {
                x: `${pipe.horizontalPosition}`,
                y: `${pipe.gapY + pipe.gapHeight / 2}`,
                width: `${Constants.PIPE_WIDTH}`,
                height: `${Viewport.CANVAS_HEIGHT - (pipe.gapY + pipe.gapHeight / 2)}`,
                fill: "green",
                class: "dynamic",
            });

            // Append both pipe segments
            svg.appendChild(pipeTop);
            svg.appendChild(pipeBottom);
        });
    };
};

/**
 * Renders "ghost birds" on the canvas, showing past trajectories of the bird.
 *
 * Each ghost is semi-transparent and represents a past vertical position
 * at the same horizontal location as the current bird.
 *
 * @param positions An array of past vertical positions (or nulls).
 */
export const renderGhost = (positions: (number | null)[]) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;

    // Remove old ghost birds before rendering new
    document.querySelectorAll(".ghost").forEach(elem => elem.remove());

    // Render ghost birds at all valid positions
    positions
        .filter((pos): pos is number => pos !== null)
        .forEach(position => {
            const ghostBird = createSvgElement(svg.namespaceURI, "image", {
                href: "assets/birb.png",
                x: `${Viewport.CANVAS_WIDTH * 0.3 - Birb.WIDTH / 2}`,
                y: `${position - Birb.HEIGHT / 2}`,
                width: `${Birb.WIDTH}`,
                height: `${Birb.HEIGHT}`,
                class: "ghost",
                opacity: "0.5", // Make ghost birds semi-transparent
            });
            svg.appendChild(ghostBird);
        });
};
