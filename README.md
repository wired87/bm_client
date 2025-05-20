# SwarmScape

SwarmScape is a 3D visualization application built with Next.js, React, Three.js, and Firebase. It simulates swarm behavior (Boids) in a 3D environment where the boids' existence and properties can be dynamically controlled via Firebase Realtime Database. The application also features AI-driven adjustments for map element heights based on swarm density and AI-powered suggestions for swarm behavior parameters.

## Core Features

-   **3D Swarm Simulation**: Utilizes Three.js to render boids (cone-shaped elements) exhibiting swarm dynamics (cohesion, separation, alignment).
-   **Firebase Realtime Integration**: Boids are configured and managed through Firebase Realtime Database. Changes in the database (addition, modification, removal of boid configurations) are reflected in the simulation in real-time.
-   **Dynamic Parameter Control**: UI controls allow users to adjust global swarm behavior parameters.
-   **Interactive Camera**: Orbit controls for navigating the 3D scene.
-   **AI-Powered Height Map Adjustment**: Dynamically adjusts the heights of underlying map cells based on swarm density, with suggestions from a Genkit AI flow.
-   **AI Parameter Suggestions**: Users can get AI-driven suggestions for swarm parameters based on desired behavior descriptions.

## Getting Started

1.  **Firebase Setup**:
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable Realtime Database.
    *   In your Realtime Database, create a root node named `boidConfigs`. Under this node, you can add individual boid configurations. Each child should have a unique key (this will be the boid's ID) and can include properties like `initialX`, `initialY`, `initialZ`, and `color`. Example:
        ```json
        {
          "boidConfigs": {
            "boid_1": {
              "initialX": 0,
              "initialY": 5,
              "initialZ": 0,
              "color": "#FF0000"
            },
            "boid_2": {
              "color": "#00FF00"
            }
          }
        }
        ```
    *   Update the placeholder Firebase configuration in `src/lib/firebase.ts` with your project's actual credentials.

2.  **Environment Variables**:
    *   If using Genkit AI features with Google AI, ensure your `GOOGLE_API_KEY` (or similar, depending on the Genkit setup for `googleAI()`) is set in a `.env` file.
    *   `.env`:
        ```
        GOOGLE_API_KEY=your_google_ai_api_key
        ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Run Development Servers**:
    *   For the Next.js app:
        ```bash
        npm run dev
        ```
    *   For Genkit AI flows (in a separate terminal):
        ```bash
        npm run genkit:watch
        ```

The application will be accessible at `http://localhost:9002` by default.
The Genkit developer UI will be accessible at `http://localhost:4000` by default.

## Project Structure

-   `src/app/page.tsx`: Main application page, integrates all components.
-   `src/components/swarm-scape/`: React components specific to SwarmScape.
    -   `SwarmCanvas.tsx`: Handles Three.js rendering and boid animation.
    -   `ControlsPanel.tsx`: UI for controlling simulation parameters.
    -   `types.ts`: TypeScript type definitions.
-   `src/lib/`: Core logic and utilities.
    -   `swarm-logic.ts`: The `Boid` class and swarm behavior implementation.
    -   `firebase.ts`: Firebase initialization.
-   `src/ai/`: Genkit AI flows.
    -   `flows/dynamic-parameter-suggestions.ts`: AI flow for suggesting swarm parameters.
    -   `flows/adjust-height-map.ts`: AI flow for adjusting map heights.
    -   `genkit.ts`: Genkit configuration.
-   `public/`: Static assets.
-   `src/app/globals.css`: Global styles and Tailwind CSS theme.
