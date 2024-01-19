import {MidiEvent} from "midi-writer-js/build/types/midi-events/midi-event.js";

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

    export class NoteOnEvent {
        constructor(options: {pitch: string[] | number[], duration: string, wait?: string, velocity?: number, channel?: number});
    }

    export class NoteOffEvent {
        constructor(options: {pitch: string[] | number[], duration: string, wait?: string, velocity?: number, channel?: number});
    }

    export class PitchBendEvent implements MidiEvent {
        channel: number;
        data: number[];
        delta: number;
        name: string;
        status: 0xE0;
        constructor(fields: any);
        scale14bits(zeroOne: any): number;
    }

    export class ProgramChangeEvent {
        constructor(options: {instrument: number, channel?: number});
    }

    export class TimeSignatureEvent {
        constructor(numerator: number, denominator: number, midiclockspertick: number, notespermidiclock: number);
    }
}
