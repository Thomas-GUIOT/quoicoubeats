import React from 'react';
import './TablatureGrid.css';

const TablatureGrid = ({ notes, midiData, noteHeight }) => {
  const renderNotes = () => {
    return notes.map((note, index) => (
      <div key={index} className="note-label">
        {note}
      </div>
    ));
  };

  const renderMeasures = () => {
    let currentTime = 0;
    let measures = [[]];

    midiData.forEach((event) => {
      const { Note, DeltaTime } = event;
      if (DeltaTime > 0) {
        currentTime += DeltaTime;
        measures.push([]);
      }
      measures[measures.length - 1].push(Note);
    });

    return measures.map((measure, measureIndex) => (
      <div key={measureIndex} className="measure">
        {notes.map((note, noteIndex) => (
          <div
            key={noteIndex}
            className={`note ${measure.includes(note) ? 'active' : 'inactive'}`}
            style={{ height: noteHeight }}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className="tablature-grid">
      <div className="note-labels">{renderNotes()}</div>
      <div className="measures">{renderMeasures()}</div>
    </div>
  );
};

export default TablatureGrid;
