/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";
import {
    fromEvent,
    interval,
    map,
    merge,
    scan,
    startWith,
    filter,
    timer,
    switchMap,
    catchError,
    takeWhile,
    exhaustMap,
    Observable,
    take,
    takeUntil,
    Subject,
    combineLatest,
    share,
} from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { render, renderGhost } from "./view";
import { tick, jump } from "./state";
import { State, Constants, initialState } from "./types";
import { parsePipeLine } from "./util";

/**
 * Create a timed observable stream of Pipe objects from CSV data.
 *
 * @param csvContents the CSV string containing pipe definitions.
 * @returns an Observable that emits Pipe objects at their scheduled times.
 */
const createPipeStream$ = (csvContents: string) => {
    // Remove surrounding whitespace, split into lines, and skip the header
    const lines = csvContents.trim().split("\n").slice(1);

    // Parse each line into a Pipe object
    const pipes = lines.map(line => parsePipeLine(line));

    // Create a timer observable for each pipe,
    // scheduled to emit at its given time (p.time).
    // Each emission returns a reducer function that adds the pipe to the state.
    return merge(
        ...pipes.map(p =>
            timer(p.time).pipe(
                map(
                    () =>
                        (s: State): State => ({
                            ...s,
                            pipes: [...s.pipes, p],
                            gameStarted: true,
                        }),
                ),
            ),
        ),
    );
};

/**
 * Handle user input (space key to jump)
 * @returns Observable that emits reducer functions
 * which apply the "jump" action to the game state
 */
const createUserInput$ = () => {
    const key$ = fromEvent<KeyboardEvent>(document, "keypress");
    return key$.pipe(
        filter(({ code }) => code === "Space"),
        map(() => (s: State) => jump(s)),
    );
};

/**
 * Create a game tick stream
 * @returns Observable that emits reducer functions
 * that apply a "tick" update at fixed intervals
 */
const createGameTick$ = () =>
    interval(Constants.TICK_RATE_MS).pipe(map(() => tick));

/**
 * Main game state stream.
 * Merges ticks, pipes, and user input reducers into one stream of State.
 */
export const state$ = (csvContents: string) => {
    const space$ = createUserInput$();
    const tick$ = createGameTick$();
    const pipes$ = createPipeStream$(csvContents);

    return merge(tick$, pipes$, space$).pipe(
        scan((state, reducerFn) => reducerFn(state), initialState),
        startWith(initialState),
    );
};

/**
 * Creates a pure observable representing a single game session.
 * This function only creates the stream.
 *
 * @param csvContents - The CSV data defining pipe positions and timings.
 * @returns An Observable<State> emitting the evolving game state for this session.
 */
const createGameSession$ = (csvContents: string): Observable<State> => {
    return state$(csvContents).pipe(
        takeWhile(state => !state.gameEnd, true), // Stop when game ends
        share(),
    );
};

/**
 * Creates a ghost observable from a recorded bird path.
 * This is a pure function that creates the ghost stream.
 *
 * @param path - Array of bird positions recorded during gameplay
 * @returns Observable that replays the bird's path
 */
const createGhost$ = (path: number[]): Observable<number | null> => {
    return interval(Constants.TICK_RATE_MS).pipe(
        take(path.length),
        // Emit bird positions, and emit `null` at the end to signal cleanup
        map(i => (i < path.length - 1 ? path[i] : null)),
    );
};

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    const csvUrl = `${baseUrl}/assets/map.csv`;

    // Get the file from URL
    const csv$ = fromFetch(csvUrl).pipe(
        switchMap(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`Fetch error: ${response.status}`);
            }
        }),
        catchError(err => {
            console.error("Error fetching the CSV file:", err);
            throw err;
        }),
    );

    const click$ = fromEvent(document.body, "mousedown");
    const allGhosts: Observable<number | null>[] = [];
    // Subject to signal game end (used for ghost termination)
    const gameEnd$ = new Subject<void>();

    // Main game pipeline - side effects are contained in subscribers
    csv$.pipe(
        switchMap(contents =>
            click$.pipe(
                exhaustMap(() => {
                    const gameSession$ = createGameSession$(contents);
                    const path: number[] = []; // Store bird path for ghost creation

                    // Subscribe to collect bird path and handle game end
                    gameSession$.subscribe({
                        next: state => {
                            // Side effect: Collect bird path for ghost replay
                            path.push(state.bird.verticalPosition);
                        },
                        complete: () => {
                            // Side effects when game ends:
                            gameEnd$.next(); // Signal game end to other subscribers

                            // Create and store ghost observable
                            const ghost$ = createGhost$(path);
                            allGhosts.push(ghost$);
                        },
                    });

                    // Return the game session stream for the main pipeline
                    return gameSession$;
                }),
            ),
        ),
    ).subscribe(render()); // Render main game - side effect contained here

    // Ghost rendering pipeline
    click$
        .pipe(
            // On each new game, replay all ghost observables in parallel
            exhaustMap(() =>
                combineLatest(allGhosts).pipe(takeUntil(gameEnd$)),
            ),
        )
        .subscribe(positions => renderGhost(positions));
}
