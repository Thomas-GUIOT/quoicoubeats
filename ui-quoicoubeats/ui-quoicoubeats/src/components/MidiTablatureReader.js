import React, { useState } from "react";
import MidiParser from "midi-parser-js";
import TablatureGrid from "./TablatureGrid";
import PianoRoll from "react-piano-roll";

const MidiTablatureReader = () => {
  const [notes, setNotes] = useState([]);

  const notess = ["A", "B", "C", "D"];

  const measures = [
    { Note: "A", DeltaTime: 0 },
    { Note: "B", DeltaTime: 0 },
    { Note: "C", DeltaTime: 64 },
    { Note: "D", DeltaTime: 0 },
    { Note: "A", DeltaTime: 64 },
  ];

  const noteHeight = "30px";

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const midiData = new Uint8Array(e.target.result);
        const parsedData = MidiParser.parse(midiData);

        // Extrait les données de notes du fichier MIDI
        const extractedNotes = extractNotes(parsedData);
        console.log(extractedNotes);
        setNotes(extractedNotes);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Fonction pour extraire les données de notes du fichier MIDI
  const extractNotes = (midiData) => {
    const track = midiData.track[0]; // Sélection du premier track pour l'exemple
    console.log(track);
    const extractedNotes = track.event.reduce((acc, event) => {
      if (event.type === 9) {
        const note = `Note: ${event.data[0]}, Velocity: ${event.data[1]}, DeltaTime: ${event.deltaTime}`;
        acc.push(note);
      }
      return acc;
    }, []);

    return extractedNotes;
  };

  return (
    <div>
      <input type="file" accept=".mid" onChange={handleFileChange} />
      {/* Affichage des données de notes */}
      <div>
        <h2>Notes extraites du fichier MIDI :</h2>
        <ul>
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
        <PianoRoll
          width={1200}
          height={660}
          zoom={6}
          resolution={2}
          gridLineColor={0x333333}
          blackGridBgColor={0x1e1e1e}
          whiteGridBgColor={0x282828}
          noteData={[
            ["0:0:0", "F5", ""],
            ["0:0:0", "C4", "2n"],
            ["0:0:0", "D4", "2n"],
            ["0:0:0", "E4", "2n"],
            ["0:2:0", "B4", "4n"],
            ["0:3:0", "A#4", "4n"],
            ["0:0:0", "F2", ""],
          ]}
        />
        <TablatureGrid
          notes={notess}
          midiData={measures}
          noteHeight={noteHeight}
        />
      </div>
    </div>
  );
};

export default MidiTablatureReader;
