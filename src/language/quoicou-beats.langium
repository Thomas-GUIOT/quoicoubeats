grammar QuoicouBeats

entry QuoicouBeats:
    (music=Music)
   (keyboard=Keyboard)?;

Music:
    'Music' name=STRING '{'
        'Tempo' tempo=NUMBER
        'Time' 'Signature' numerator=NUMBER '/' denominator=NUMBER
        'Ticks' tickCount=NUMBER
        ('DefaultOctave' defaultOctave=NUMBER)?
        ('DefaultNoteType' defaultNoteType=NoteType)?
        ('Patterns' '{'
            (patterns+=PatternDeclaration)+
        '}')?
        'Tracks' '{'
            (tracks+=Track)+
        '}'
    '}';

Keyboard:
    'KeyboardBinding' '{'
        bindingConf=InstrumentBinding
    '}';

InstrumentBinding:
    instrument=Instrument
    'Bindings' '{' (bindings+=Binding)+ '}';

Binding:
    'Key' key=KeyboardKey '->' note=(DrumNote | ClassicNote);
    
PatternDeclaration:
    name=STRING '{'
        (notes+=MusicEvent)+
    '}';

Track:
    'Track' name=STRING '{'
        instrument=Instrument
        'Notes' '{'
            (notes+=MusicEvent)+
        '}'
    '}';

TimeSignatureChange:
    'Time' 'Signature' numerator=NUMBER '/' denominator=NUMBER;

TempoChange:
    'Tempo' tempo=NUMBER;

MusicEvent:
    (PatternReference | ClassicNote | DrumNote | TimeSignatureChange | TempoChange | PitchBend);

PatternReference:
    'pattern' pattern=[PatternDeclaration:STRING] ('x' repeatCount=NUMBER)? ('[' (pause+=NoteType)+ ']')?;

fragment Note:
    ('(' (delay+=NoteType)+ ')' | '[' (pause+=NoteType)+ ']')? ('v' velocity=NUMBER)?;

DrumNote:
    element=DRUMNOTE
    Note;

ClassicNote:
    note=NOTE
    (octave=NUMBER)?
    (noteType=NoteType)?
    Note;

PitchBend:
    'Pitch' 'Bend' bend=NUMBER (duration+=NoteType)+ ('(' (delay+=NoteType)+ ')')?;

Instrument:
    'Instrument' instrument=STRING;

terminal DRUMNOTE: /kd|bd|sd|ch|hh|rc|cc|oh/;
terminal NUMBER returns number: /[+-]?([0-9]*[.])?[0-9]+/;
terminal NoteType: /(?:noire|blanche|ronde|croche|doubleCroche|tripleCroche|quadrupleCroche)(?:Pointee|Triplet)?|accord/g;
hidden terminal WS: /\s+/;
terminal ID: /[a-zA-Z_]\w*/;
terminal STRING: /"([^"\\]|\\.)*"/;
terminal NOTE: /(Do|Re|Mi|Fa|Sol|La|Si)[#b]?/;
terminal KeyboardKey: /\S/;
