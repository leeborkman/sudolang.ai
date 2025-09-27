#!/usr/bin/env node

import { Command } from "commander";
import { executeClone } from "../lib/cli-core.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import process from "process";
import { errorCauses } from "error-causes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
);

// Use the same error causes as the CLI library
const [, handleCliErrors] = errorCauses({
  ValidationError: {
    code: "VALIDATION_ERROR",
    message: "Input validation failed",
  },
  FileSystemError: {
    code: "FILESYSTEM_ERROR",
    message: "File system operation failed",
  },
  CloneError: {
    code: "CLONE_ERROR",
    message: "AI folder cloning failed",
  },
});

const createCli = () => {
  const program = new Command();

  return program
    .name("aidd")
    .description(
      "AI Driven Development - Clone SudoLang AI agent orchestration system",
    )
    .version(packageJson.version)
    .argument("[target-directory]", "target directory to clone ai/ folder", ".")
    .option("-f, --force", "overwrite existing files")
    .option("-d, --dry-run", "show what would be copied without copying")
    .option("-v, --verbose", "provide detailed output")
    .option(
      "-c, --cursor",
      "create .cursor symlink for Cursor editor integration",
    )
    .action(async (targetDirectory, { force, dryRun, verbose, cursor }) => {
      const result = await executeClone({
        targetDirectory,
        force,
        dryRun,
        verbose,
        cursor,
      });

      if (!result.success) {
        // Create a proper error with cause for handleErrors
        const error = new Error(result.error.message, {
          cause: result.error.cause || {
            code: result.error.code || "UNEXPECTED_ERROR",
          },
        });

        // Use handleErrors instead of manual switching
        try {
          handleCliErrors({
            ValidationError: ({ message }) => {
              console.error(`❌ Validation Error: ${message}`);
              console.error("💡 Try using --force to overwrite existing files");
            },
            FileSystemError: ({ message, cause }) => {
              console.error(`❌ File System Error: ${message}`);
              console.error(
                "💡 Check file permissions and available disk space",
              );
              if (verbose && cause) {
                console.error("🔍 Caused by:", cause.message || cause);
              }
            },
            CloneError: ({ message, cause }) => {
              console.error(`❌ Clone Error: ${message}`);
              console.error("💡 Check source directory and target permissions");
              if (verbose && cause) {
                console.error("🔍 Caused by:", cause.message || cause);
              }
            },
          })(error);
        } catch {
          // Fallback for unexpected errors
          console.error(`❌ Unexpected Error: ${result.error.message}`);
          if (verbose && result.error.cause) {
            console.error("🔍 Caused by:", result.error.cause);
          }
        }
      }

      process.exit(result.success ? 0 : 1);
    });
};

// Execute CLI
createCli().parse();
