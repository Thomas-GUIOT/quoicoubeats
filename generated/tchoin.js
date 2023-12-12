const MidiWriter = require('midi-writer-js');
const fs = require('fs');

    let midiTracks = [];
    

        const trackMidi = new MidiWriter.Track();
        trackMidi.setTimeSignature(4, 4, 24, 8);

        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
        
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [64], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [64], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [60], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 2}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 2}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [61], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [63], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [63], duration: 2}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [64], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [64], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [60], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 2}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [59], duration: 2}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [61], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [63], duration: 4}));
            
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [63], duration: 2}));
            midiTracks.push(trackMidi);
    const write = new MidiWriter.Writer(midiTracks);
    const midiData = write.buildFile();
    fs.writeFileSync('./tchoin.mid', midiData, 'binary');
    