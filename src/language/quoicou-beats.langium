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
    instrument=Instrument '{'
        (bindings+=Binding)+
    '}';

Binding:
    'Key' key=KeyboardKey '->' note=NOTE;
    
PatternDeclaration:
    name=STRING '{'
        (notes+=(DrumNote|ClassicNote))+
    '}';

Track:
    'Track' name=STRING '{'
        instrument=Instrument
        'Notes' '{'
            (notes+=PatternOrNote)+
        '}'
    '}';

PatternOrNote:
    (PatternReference | ClassicNote | DrumNote);

PatternReference:
    'pattern' pattern=[PatternDeclaration:STRING] ('x' repeatCount=INT)?;

fragment Note:
    ('(' (delay+=NoteType)+ ')' | '[' (pause+=NoteType)+ ']')?;

DrumNote:
    element=DRUMNOTE
    Note;

ClassicNote:
    note=NOTE
    (octave=INT)?
    (noteType=NoteType)?
    Note;

Instrument:
    'Instrument' instrument=STRING;

terminal DRUMNOTE: /kd|sd|ch/;
terminal INT returns number: /(\-1|[0-9]+)/;
terminal NoteType: /noire|blanche|ronde|croche|doubleCroche|tripleCroche|quadrupleCroche|accord/;
hidden terminal WS: /\s+/;
terminal ID: /[a-zA-Z_]\w*/;
terminal STRING: /"([^"\\]|\\.)*"/;
terminal NOTE: /(Do|Re|Mi|Fa|Sol|La|Si)[#b]?/;
terminal KeyboardKey: /\S/;
