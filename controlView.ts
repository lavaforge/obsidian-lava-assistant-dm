import { ItemView, WorkspaceLeaf, MarkdownView } from 'obsidian';
import type LavaDmPlugin from './main';

export const VIEW_TYPE_EXAMPLE = 'example-view';

export class ExampleView extends ItemView {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private audioBlob: Blob | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly plugin: LavaDmPlugin,
    ) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return 'Example view';
    }

    async onOpen() {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            if (!this.audioChunks) return;
            this.audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
        };

        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h4', { text: 'Example view' });

        const buttonsContainer = container.createEl('div');

        const recordButton = buttonsContainer.createEl('button', {
            text: 'Start',
        });
        recordButton.onclick = async () => {
            this.audioChunks = [];
            this.mediaRecorder?.start();
        };

        const stopButton = buttonsContainer.createEl('button', {
            text: 'Stop',
        });
        stopButton.onclick = () => {
            this.mediaRecorder?.stop();
        };

        const playButton = buttonsContainer.createEl('button', {
            text: 'Play',
        });
        playButton.onclick = () => {
            if (this.audioBlob) {
                const audioUrl = URL.createObjectURL(this.audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
            }
        };

        const transcribeButton = buttonsContainer.createEl('button', {
            text: 'Transcribe',
        });
        transcribeButton.onclick = async () => {
            if (this.audioBlob) {
                this.plugin.currentTranscription = (
                    await transcribeAudio(this.audioBlob, this.plugin.apiKey)
                ).text;
            }
        };

        // new button which I will use for debugging
        const debugButton = buttonsContainer.createEl('button', {
            text: 'Debug',
        });
        debugButton.onclick = () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);

            // Make sure the user is editing a Markdown file.
            if (view) {
                console.log(view);
            } else {
                console.log('well...');
            }
        };
    }

    async onClose() {
        // Nothing to clean up.
    }
}

async function transcribeAudio(audioBlob: any, apiKey: string) {
    if (!audioBlob) {
        throw new Error('No audio blob to transcribe');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch(
            'https://api.openai.com/v1/audio/transcriptions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
                body: formData,
            },
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Transcription result:', result.text);
        return result;
    } catch (error) {
        console.error('Failed to transcribe audio:', error);
        throw error;
    }
}
