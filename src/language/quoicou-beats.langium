grammar QuoicouBeats

entry QuoicouBeats:
    (music=Music)
   (keyboard=Keyboard)?;

Music:
    'Music' name=STRING '{'
        'Tempo' tempo=INT
        'Time' 'Signature' numerator=INT '/' denominator=INT
        'Ticks' tickCount=INT
        ('DefaultOctave' defaultOctave=INT)?
        ('DefaultNoteType' defaultNoteType=NoteType)?
        (patterns+=PatternDeclaration)*
        'Tracks' '{'
            (tracks+=Track)+
        '}'
    '}';

Keyboard:
    'KeyboardBinding' '{'
        bindingConf=InstrumentBinding
    '}';

InstrumentBinding:
    instrument=Instrument '{'
        (bindings+=Binding)+
    '}';

Binding:
    'Key' key=KeyboardKey '->' note=NOTE;
    
PatternDeclaration:
    'declare' name=STRING '{'
        (notes+=Note)+
    '}';

Track:
    'Track' name=STRING '{'
        instrument=Instrument
        'Notes' '{'
            (notes+=PatternOrNote)+
        '}'
    '}';

PatternOrNote:
    (PatternReference | Note);

PatternReference:
    'pattern' pattern=[PatternDeclaration:STRING] ('x' repeatCount=INT)?;

Note:
    (DrumNote | ClassicNote)
    ('(' (delay+=NoteType)+ ')' | '[' (pause+=NoteType)+ ']')?;

DrumNote:
    element=DRUMNOTE;

ClassicNote:
    (octave=INT)?
    (noteType=NoteType)?;

Instrument:
    'Instrument' instrument=STRING;

terminal DRUMNOTE: /kd|sd|ch/;
terminal INT: /[0-9]+/;
terminal NoteType: /noire|blanche|ronde|croche|doubleCroche|tripleCroche|quadrupleCroche|accord/;
hidden terminal WS: /\s+/;
terminal ID: /[a-zA-Z_]\w*/;
terminal STRING: /"([^"\\]|\\.)*"/;
terminal NOTE: /(Do|Re|Mi|Fa|Sol|La|Si)[#b]?/;
terminal KeyboardKey: /\S/;
