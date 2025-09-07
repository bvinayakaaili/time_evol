# Time Travel Image Evolution

This web application uses the Google Gemini API to generate a visual timeline of a location or scene, evolving from the 1800s to 2100. Users can start with a text prompt or a reference image and watch as the AI creates a decade-by-decade progression. Finally, the generated image sequence can be turned into a dynamic time-lapse video.

## Features

-   **Text-to-Timeline**: Describe a scene (e.g., "Times Square, NYC") and see it visualized across different eras.
-   **Image-to-Timeline**: Upload a starting image to guide the AI's evolution process, maintaining the core composition.
-   **Decade-by-Decade Evolution**: Generates a new image for every decade from 1800 to 2100.
-   **Cinematic Video Generation**: With a single click, transform the entire image timeline into an animated time-lapse video.
-   **Responsive Design**: A clean, modern, and responsive UI that works across various devices.
-   **Interactive Timeline**: Horizontally scroll through the generated images to see the progression.

## How It Works

The application leverages several powerful models from the Google Gemini API to achieve its results:

1.  **Initial Image Generation (1800s)**:
    -   If a user provides a **reference image**, the app uses the `gemini-2.5-flash-image-preview` model to transform that image to fit the style and technology of the 1800s, based on the user's text prompt.
    -   If only a **text prompt** is given, the app uses the `imagen-4.0-generate-001` model to create the first image from scratch.

2.  **Timeline Evolution (1810s - 2100s)**:
    -   For each subsequent decade, the application takes the *previously generated image* and feeds it back into the `gemini-2.5-flash-image-preview` model.
    -   The prompt instructs the model to "Evolve this scene to the [next decade]," ensuring a consistent and logical progression of the subject and perspective over time.

3.  **Video Creation**:
    -   After the full image timeline is generated, the user is prompted to create a video.
    -   The `veo-2.0-generate-001` model is used for this task. It takes the first generated image (from the 1800s) and the original text prompt to create a cohesive, animated time-lapse video that encapsulates the entire evolution.

## Technologies Used

-   **Frontend**: HTML5, CSS3, TypeScript (transpiled in-browser via esbuild)
-   **Google Gemini API (`@google/genai`)**:
    -   `gemini-2.5-flash-image-preview`: For image-to-image evolution.
    -   `imagen-4.0-generate-001`: For initial text-to-image generation.
    -   `veo-2.0-generate-001`: For video generation.

## Setup and Running

### Prerequisites

-   A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
-   A configured environment with your Google Gemini API key.

### Configuration

This application is designed to securely access the Gemini API key from an environment variable.

1.  The application code in `index.tsx` expects the API key to be available at `process.env.API_KEY`.
2.  You must set up the hosting environment (e.g., using a local development server or a cloud deployment platform) to provide this environment variable to the frontend.

**Note**: Do not hardcode your API key directly into the source code.

### Running the Application

Once the environment is configured with the API key, simply open the `index.html` file in your web browser.

## File Structure

```
.
├── index.html          # The main HTML structure of the application.
├── index.css           # All styles for the application.
├── index.tsx           # The core application logic using TypeScript and Gemini API.
├── metadata.json       # Project metadata for the hosting environment.
└── README.md           # This file.
```
