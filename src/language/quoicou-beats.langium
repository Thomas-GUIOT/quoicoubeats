grammar QuoicouBeats

entry Music:
    'Music' name=STRING '{'
        'Tempo' tempo=INT
        'Time' 'Signature' numerator=INT '/' denominator=INT
        'Ticks' tickCount=INT
        tracks=Tracks
    '}';

Tracks:
    'Tracks' '{'
        (tracks+=Track)+
    '}';

Track:
    'Track' name=STRING '{'
        instrument=Instrument
        (notes+=Note)+
    '}';

Note:
    note=NOTE noteType=NoteType;

Instrument:
    'Instrument' instrument=INT;



terminal NoteType: /noire|blanche|ronde|croche|doubleCroche|tripleCroche|quadrupleCroche/;
hidden terminal WS: /\s+/;
terminal ID: /[a-zA-Z_]\w*/;
terminal INT: /[0-9]+/;
terminal STRING: /"([^"\\]|\\.)*"/;
terminal NOTE: /(Silence|Do|Re|Mi|Fa|Sol|La|Si)[#b]?/;
