declare module 'midi-writer-js' {
    export class Writer {
        constructor(tracks: Track[]);
        buildFile(): string;
        addTrack(track: Track): void;
    }

    export class Track {
        constructor();
        addEvent(event: NoteEvent | ProgramChangeEvent, options?: {sequential?: boolean, simultaneous?: boolean}): void;
        addInstrumentName(name: string): void;
        setTempo(bpm: number): void;
    }

    export class NoteEvent {
        constructor(options: {pitch: string[] | number[], duration: string, wait?: string, velocity?: number, channel?: number});
    }

    export class ProgramChangeEvent {
        constructor(options: {instrument: number, channel?: number});
    }

    export class TimeSignatureEvent {
        constructor(numerator: number, denominator: number, midiclockspertick: number, notespermidiclock: number);
    }
}
