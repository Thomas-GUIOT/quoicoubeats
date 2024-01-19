export function noteTypeToTicks(noteType: string, ticks: number): number {
    if (!noteType) return 0;
    const noteTypeToTicks: any = {
        ronde: 4 * ticks,
        blanche: 2 * ticks,
        noire: ticks,
        croche: 0.5 * ticks,
        doubleCroche: 0.25 * ticks,
        tripleCroche: 0.125 * ticks,
        quadrupleCroche: 0.0625 * ticks,
        drum: 1,
        accord: 0,
    };
    if (noteTypeToTicks[noteType] !== undefined) return noteTypeToTicks[noteType];
    else throw new Error(`Type de note inconnu: ${noteType}`);
}
