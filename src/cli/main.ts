import type { QuoicouBeats } from "../language/generated/ast.js";
import chalk from "chalk";
import { Command } from "commander";
import { QuoicouBeatsLanguageMetaData } from "../language/generated/module.js";
import { createQuoicouBeatsServices } from "../language/quoicou-beats-module.js";
import { extractAstNode } from "./cli-util.js";
import {
  generateJavaScript,
  generateKeyboardProgram,
  generateMidiPlayerAndVizualizer,
} from "./generator.js";
import { NodeFileSystem } from "langium/node";
import * as url from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const packagePath = path.resolve(__dirname, "..", "..", "package.json");
const packageContent = await fs.readFile(packagePath, "utf-8");

export const generateAction = async (
  fileName: string,
  opts: GenerateOptions
): Promise<void> => {
  const services = createQuoicouBeatsServices(NodeFileSystem).QuoicouBeats;
  const model = await extractAstNode<QuoicouBeats>(fileName, services);

  const generatedFilePath = generateJavaScript(
    model,
    fileName,
    opts.destination
  );
  console.log(
    chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`)
  );

  const finalVizualizerFilePath = generateMidiPlayerAndVizualizer(
    model,
    fileName,
    opts.destination,
    generatedFilePath
  );

  if (finalVizualizerFilePath)
    console.log(
      chalk.green(
        `Keyboard program generated successfully: ${finalVizualizerFilePath}`
      )
    );

  const keyboardPlayGeneratedFilePath = generateKeyboardProgram(
    model,
    fileName,
    opts.destination,
    generatedFilePath
  );

  if (keyboardPlayGeneratedFilePath)
    console.log(
      chalk.green(
        `Keyboard program generated successfully: ${keyboardPlayGeneratedFilePath}`
      )
    );
};

export type GenerateOptions = {
  destination?: string;
};

export default function (): void {
  const program = new Command();

  program.version(JSON.parse(packageContent).version);

  const fileExtensions = QuoicouBeatsLanguageMetaData.fileExtensions.join(", ");
  program
    .command("generate")
    .argument(
      "<file>",
      `source file (possible file extensions: ${fileExtensions})`
    )
    .option("-d, --destination <dir>", "destination directory of generating")
    .description(
      'generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file'
    )
    .action(generateAction);

  program.parse(process.argv);
}
