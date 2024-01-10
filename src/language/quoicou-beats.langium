grammar QuoicouBeats

entry Music:
    'Music' name=STRING '{'
        'Tempo' tempo=INT
        'Time' 'Signature' numerator=INT '/' denominator=INT
        'Ticks' tickCount=INT
        (patterns+=PatternDeclaration)*
        'Tracks' '{'
            (tracks+=Track)+
        '}'
    '}';

PatternDeclaration:
    'declare' name=STRING '{'
        (notes+=Note)+
    '}';

Track:
    'Track' name=STRING '{'
        instrument=Instrument
        'Notes' '{'
            (notes+=Note)+
        '}'
    '}';

PatternOrNote:
    Note | PatternReference | DrumNote;

DrumNote:
    note=DRUMNOTE (bars+=INT)+;

PatternReference:
    'pattern' pattern=[PatternDeclaration:STRING] ('x' repeatCount=INT)?;

Note:
    note=NOTE octave=INT noteType=NoteType ('(' (delay+=NoteType)+ ')' | '[' (pause+=NoteType)+ ']')?;

Instrument:
    'Instrument' instrument=INT;

terminal DRUMNOTE: /kd|sd|ch/;
terminal INT: /[0-9]+/;
terminal NoteType: /noire|blanche|ronde|croche|doubleCroche|tripleCroche|quadrupleCroche|accord/;
hidden terminal WS: /\s+/;
terminal ID: /[a-zA-Z_]\w*/;
terminal STRING: /"([^"\\]|\\.)*"/;
terminal NOTE: /(Silence|Do|Re|Mi|Fa|Sol|La|Si)[#b]?/;
