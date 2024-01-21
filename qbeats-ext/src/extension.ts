// extension.ts

import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";

let decorationType: vscode.TextEditorDecorationType;

const diagnosticsCollection =
  vscode.languages.createDiagnosticCollection("QuoicouBeats");

export function activate(context: vscode.ExtensionContext) {
  // Inscrire la commande pour lancer l'analyse
  let disposable = vscode.commands.registerCommand(
    "extension.analyzeCode",
    () => {
      analyzeCode();
    }
  );

  // Écouter les modifications de texte
  let changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document === vscode.window.activeTextEditor?.document && e.document.languageId === 'qb') {
      analyzeCode();
    }
  });

vscode.commands.registerCommand("extension.openKeyboardHtml", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const fileNameWithoutExtension = editor.document.fileName.replace("scenarios", "generated").split(".")[0];
        const filePath = `${fileNameWithoutExtension}-wk.html`;
        openHtmlKeyboardPage(filePath);
    }
});

  context.subscriptions.push(disposable, changeDisposable);
}

async function analyzeCode() {
  const activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    const document = activeEditor.document;
    const text = document.getText();

    // Utilisez votre analyseur ou la grammaire tmLanguage.json pour détecter les erreurs
    const errors = analyzeForErrors(text);

    if (errors.length > 0) {
      // Afficher les erreurs dans l'éditeur
      showErrorsInEditor(activeEditor, errors);
    } else {
      if (decorationType) {
        decorationType.dispose();
      }
      diagnosticsCollection.clear();
    }
  }
}

function analyzeForErrors(text: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  const missingKeywords = ["Tempo", "TimeSignature", "Ticks"];

  for (const keyword of missingKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    if (!regex.test(text)) {
      const tracksIndex = text.indexOf("Tracks");
      const startPosition =
        vscode.window.activeTextEditor?.document.positionAt(0);
      const endPosition =
        vscode.window.activeTextEditor?.document.positionAt(tracksIndex);
      const range = new vscode.Range(startPosition!, endPosition!);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Le mot-clé ${keyword} est manquant.`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }
  }

  // Trouver tous les blocs "Track"
  const trackBlocks = text.match(/Track\s*"[^"]*"\s*\{[^}]*\}/g) || [];

  for (const trackBlock of trackBlocks) {
    if (!trackBlock.includes("Instrument")) {
      const trackIndex = text.indexOf(trackBlock);
      const instrumentIndex = trackIndex + trackBlock.indexOf("}");
      const startPosition =
        vscode.window.activeTextEditor?.document.positionAt(trackIndex);
      const endPosition =
        vscode.window.activeTextEditor?.document.positionAt(instrumentIndex);
      const range = new vscode.Range(startPosition!, endPosition!);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Le mot-clé Instrument est manquant dans le bloc Track.`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }
  }

  // Vérifier la signature temporelle
  const timeSignatureMatch = text.match(/TimeSignature\s*(\d+\/\d+)/);
  if (!timeSignatureMatch) {
    const timeSignatureIndex = text.indexOf("TimeSignature");
    const startPosition =
      vscode.window.activeTextEditor?.document.positionAt(timeSignatureIndex);
    const endPosition = vscode.window.activeTextEditor?.document.positionAt(
      timeSignatureIndex + "TimeSignature".length
    );
    const range = new vscode.Range(startPosition!, endPosition!);
    const diagnostic = new vscode.Diagnostic(
      range,
      `La signature temporelle après TimeSignature est manquante ou invalide.`,
      vscode.DiagnosticSeverity.Error
    );
    diagnostics.push(diagnostic);
  }

  // Vérifier les valeurs de Tempo et Ticks
  const tempoMatch = text.match(/Tempo\s*(\d+)/);
  const ticksMatch = text.match(/Ticks\s*(\d+)/);
  if (!tempoMatch || isNaN(Number(tempoMatch[1]))) {
    const tempoIndex = text.indexOf("Tempo");
    const startPosition =
      vscode.window.activeTextEditor?.document.positionAt(tempoIndex);
    const endPosition = vscode.window.activeTextEditor?.document.positionAt(
      tempoIndex + "Tempo".length
    );
    const range = new vscode.Range(startPosition!, endPosition!);
    const diagnostic = new vscode.Diagnostic(
      range,
      `La valeur de Tempo n'est pas un nombre valide.`,
      vscode.DiagnosticSeverity.Error
    );
    diagnostics.push(diagnostic);
  }
  if (!ticksMatch || isNaN(Number(ticksMatch[1]))) {
    const ticksIndex = text.indexOf("Ticks");
    const startPosition =
      vscode.window.activeTextEditor?.document.positionAt(ticksIndex);
    const endPosition = vscode.window.activeTextEditor?.document.positionAt(
      ticksIndex + "Ticks".length
    );
    const range = new vscode.Range(startPosition!, endPosition!);
    const diagnostic = new vscode.Diagnostic(
      range,
      `La valeur de Ticks n'est pas un nombre valide.`,
      vscode.DiagnosticSeverity.Error
    );
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

function showErrorsInEditor(
  editor: vscode.TextEditor,
  diagnostics: vscode.Diagnostic[]
) {
  if (decorationType) {
    decorationType.dispose();
  }

  decorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: "underline wavy red",
  });

  const ranges = diagnostics.map((diagnostic) => diagnostic.range);
  editor.setDecorations(decorationType, ranges);

  diagnosticsCollection.set(editor.document.uri, diagnostics);
}

function openHtmlKeyboardPage(htmlFilePath: string) {
    const panel = vscode.window.createWebviewPanel(
        "htmlPreview", // Identifiant du panel
        "Aperçu HTML", // Titre du panel
        vscode.ViewColumn.One, // Montre le nouveau panel dans cette colonne
        {
            // Autoriser les scripts dans la vue Web
            enableScripts: true,
            // Autoriser l'accès aux ressources locales
            localResourceRoots: [vscode.Uri.file(path.dirname(htmlFilePath))]
        }
    );

    let htmlContent = fs.readFileSync(htmlFilePath, "utf8");

    // Remplacer les URL des ressources locales par des URL de vue Web

    const assetDir = path.join(path.dirname(htmlFilePath), 'assets/');
    const assetUri = panel.webview.asWebviewUri(vscode.Uri.file(assetDir));
    htmlContent = htmlContent.replace(/assets\//g, assetUri.toString());

    panel.webview.html = htmlContent;
}

export function deactivate() {}
