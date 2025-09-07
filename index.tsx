/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, Part } from '@google/genai';

// --- DOM Elements ---
const appContainer = document.getElementById('app-container') as HTMLDivElement;
const inputView = document.getElementById('input-view') as HTMLDivElement;
const resultsView = document.getElementById('results-view') as HTMLDivElement;
const promptForm = document.getElementById('prompt-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
const timeline = document.getElementById('timeline') as HTMLDivElement;
const timelineTitle = document.getElementById('timeline-title') as HTMLHeadingElement;

// Loading Overlay Elements
const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;
const loadingDecade = document.getElementById('loading-decade') as HTMLHeadingElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressBarInner = document.getElementById('progress-bar-inner') as HTMLDivElement;
const loadingMessage = document.getElementById('loading-message') as HTMLParagraphElement;

// Video Elements
const videoPromptContainer = document.getElementById('video-prompt-container') as HTMLDivElement;
const generateVideoButton = document.getElementById('generate-video-button') as HTMLButtonElement;
const declineVideoButton = document.getElementById('decline-video-button') as HTMLButtonElement;
const videoModal = document.getElementById('video-modal') as HTMLDivElement;
const videoPlayer = document.getElementById('video-player') as HTMLVideoElement;
const closeVideoButton = document.getElementById('close-video-button') as HTMLButtonElement;


// --- State ---
let ai: GoogleGenAI;
let userImage: Part | null = null;
const DECADES_TO_GENERATE = Array.from({ length: (2100 - 1800) / 10 + 1 }, (_, i) => 1800 + i * 10);
let generatedImages: { url: string; bytes: string; }[] = [];
let currentPrompt: string = '';

// --- Initialization ---
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error(error);
  showError('Failed to initialize the AI. Check API key and console.');
  promptForm.querySelectorAll('input, button').forEach(el => (el as any).disabled = true);
}

// --- Event Listeners ---
imageUpload.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) {
    userImage = null;
    imagePreviewContainer.innerHTML = '';
    return;
  }
  
  try {
    const base64Data = await fileToBase64(file);
    userImage = {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    };
    displayImagePreview(file);
  } catch (error) {
    console.error('File to Base64 conversion error:', error);
    showError('Could not process the uploaded image.');
    userImage = null;
  }
});

promptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt || !ai) return;

  await generateTimeline(prompt);
});

resetButton.addEventListener('click', () => {
  // Reset state
  timeline.innerHTML = '';
  promptInput.value = '';
  imageUpload.value = '';
  imagePreviewContainer.innerHTML = '';
  userImage = null;
  generatedImages = [];
  currentPrompt = '';
  videoPlayer.src = '';
  
  // Hide optional UI
  videoPromptContainer.setAttribute('aria-hidden', 'true');
  videoModal.setAttribute('aria-hidden', 'true');

  // Switch views
  resultsView.setAttribute('aria-hidden', 'true');
  inputView.setAttribute('aria-hidden', 'false');
  appContainer.classList.remove('show-results');
});

generateVideoButton.addEventListener('click', () => generateVideo());
declineVideoButton.addEventListener('click', () => videoPromptContainer.setAttribute('aria-hidden', 'true'));
closeVideoButton.addEventListener('click', () => {
    videoModal.setAttribute('aria-hidden', 'true');
    videoPlayer.pause();
    videoPlayer.src = '';
});

// --- Core Logic ---
async function generateTimeline(prompt: string) {
  setLoading(true, 0, 'Warming up the time machine...');
  timeline.innerHTML = '';
  generatedImages = [];
  currentPrompt = prompt;
  videoPromptContainer.setAttribute('aria-hidden', 'true');
  timelineTitle.textContent = `Timeline: "${prompt}"`;

  let lastGeneratedImage: Part | null = null;
  
  try {
    for (let i = 0; i < DECADES_TO_GENERATE.length; i++) {
      const decade = DECADES_TO_GENERATE[i];
      const progress = (i + 1) / DECADES_TO_GENERATE.length;
      setLoading(true, progress, `Generating image for the ${decade}s...`);

      let newImageBytes: string;

      // First image generation
      if (i === 0) {
        if (userImage) {
           // Use user image + prompt for the first image
           const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [ userImage, { text: `Transform this image to look like it's from the ${decade}s, based on the prompt: ${prompt}. Maintain the core composition.` }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
          });
          newImageBytes = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData.data;
        } else {
          // Use text-to-image for the first image
          const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A high-quality photo of ${prompt} in the ${decade}s.`,
            config: { numberOfImages: 1, aspectRatio: '16:9' },
          });
          newImageBytes = response.generatedImages[0].image.imageBytes;
        }
      } else { // Subsequent image generations
        if (!lastGeneratedImage) throw new Error("Missing previous image for evolution.");
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [ lastGeneratedImage, { text: `Evolve this scene to the ${decade}s. Keep the main subject and perspective consistent.` }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
        newImageBytes = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData.data;
      }

      if (!newImageBytes) throw new Error(`Image generation failed for ${decade}s.`);
      
      const imageUrl = `data:image/jpeg;base64,${newImageBytes}`;
      generatedImages.push({ url: imageUrl, bytes: newImageBytes });
      displayTimelineImage(imageUrl, `${decade}s`);

      lastGeneratedImage = {
        inlineData: { mimeType: 'image/jpeg', data: newImageBytes },
      };
    }

    videoPromptContainer.setAttribute('aria-hidden', 'false');

  } catch (error) {
    console.error(error);
    showError('A time travel anomaly occurred! Could not complete the timeline.');
  } finally {
    setLoading(false);
  }
}

async function generateVideo() {
    if (generatedImages.length === 0 || !currentPrompt) {
        showError("Cannot generate video without a timeline.");
        return;
    }

    videoPromptContainer.setAttribute('aria-hidden', 'true');
    setLoading(true, 0, 'Contacting the VEO time engine...', true);

    const videoLoadingMessages = [
        "Gathering temporal energy...",
        "Rendering keyframes from across the centuries...",
        "Stitching the timeline into a moving picture...",
        "Finalizing the cinematic time-lapse...",
        "Polishing the final reel..."
    ];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        loadingMessage.textContent = videoLoadingMessages[messageIndex % videoLoadingMessages.length];
        messageIndex++;
    }, 5000);

    try {
        const firstImage = generatedImages[0];

        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: `Create a short, animated time-lapse video showing the evolution of this scene from the 1800s to 2100. Subject: ${currentPrompt}`,
            image: {
              imageBytes: firstImage.bytes,
              mimeType: 'image/jpeg',
            },
            config: {
              numberOfVideos: 1
            }
        });

        loadingDecade.textContent = 'Generating Video...';

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");

        loadingMessage.textContent = "Downloading the final video...";
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);

        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        videoPlayer.src = videoUrl;
        videoModal.setAttribute('aria-hidden', 'false');

    } catch(error) {
        console.error("Video generation failed:", error);
        showError("Failed to generate the video. Please try again.");
    } finally {
        clearInterval(messageInterval);
        setLoading(false);
    }
}

// --- UI Functions ---
function setLoading(isLoading: boolean, progress: number = 0, message: string = '', indeterminate: boolean = false) {
  if (isLoading) {
    loadingOverlay.setAttribute('aria-hidden', 'false');
    progressBar.classList.toggle('indeterminate', indeterminate);
    progressBarInner.style.width = indeterminate ? '100%' : `${progress * 100}%`;
    
    if (!indeterminate) {
        const decade = DECADES_TO_GENERATE[Math.floor(progress * (DECADES_TO_GENERATE.length-1))];
        loadingDecade.textContent = decade ? `Generating: ${decade}s...` : 'Starting Time Engine...';
    } else {
        loadingDecade.textContent = 'Preparing Video...';
    }
    
    loadingMessage.textContent = message;
    
    // Switch to results view as soon as loading starts
    if (!appContainer.classList.contains('show-results')) {
        inputView.setAttribute('aria-hidden', 'true');
        resultsView.setAttribute('aria-hidden', 'false');
        appContainer.classList.add('show-results');
    }
  } else {
    loadingOverlay.setAttribute('aria-hidden', 'true');
    progressBar.classList.remove('indeterminate');
  }
}

function displayTimelineImage(url: string, caption: string) {
  const imageCard = document.createElement('div');
  imageCard.className = 'timeline-card';
  
  const img = document.createElement('img');
  img.src = url;
  img.alt = `Generated image for ${caption}`;

  const figcaption = document.createElement('figcaption');
  figcaption.textContent = caption;

  imageCard.appendChild(img);
  imageCard.appendChild(figcaption);

  timeline.appendChild(imageCard);
  timeline.scrollLeft = timeline.scrollWidth; // Auto-scroll to the latest image
}

function displayImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreviewContainer.innerHTML = `
            <img src="${e.target?.result}" alt="Image preview" class="preview-image"/>
            <button id="remove-image-btn" aria-label="Remove image">&times;</button>
        `;
        document.getElementById('remove-image-btn')?.addEventListener('click', () => {
            userImage = null;
            imageUpload.value = '';
            imagePreviewContainer.innerHTML = '';
        });
    };
    reader.readAsDataURL(file);
}

function showError(message: string) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  // Use a more robust way to show errors, maybe a toast notification library in a real app
  document.body.prepend(errorElement);
  setTimeout(() => errorElement.remove(), 5000);
}

// --- Utility Functions ---
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}