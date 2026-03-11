import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Biome, Distribution } from "@biomejs/js-api";

export class FileWriter {
  private buf = "";

  constructor(private filePath: string) {}

  w(str: string): void {
    this.buf += `${str}\n`;
  }

  w0(str: string): void {
    this.buf += str;
  }

  async flush(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, {
        recursive: true,
      });
    }

    const biome = await Biome.create({
      distribution: Distribution.NODE,
    });

    const { projectKey } = biome.openProject(dir);

    biome.applyConfiguration(projectKey, {
      formatter: {
        indentStyle: "space",
      },
      javascript: {
        formatter: {
          quoteStyle: "double",
        },
      },
      organizeImports: {
        enabled: true,
      },
    });

    // Keep formatter parity with `biome check --write`: initial format,
    // apply safe lint fixes (including import organization), then format again.
    const formatted = biome.formatContent(projectKey, this.buf, {
      filePath: this.filePath,
    });
    const linted = biome.lintContent(projectKey, formatted.content, {
      filePath: this.filePath,
      fixFileMode: "safeFixes",
    });
    const reformatted = biome.formatContent(projectKey, linted.content, {
      filePath: this.filePath,
    });

    if (formatted.diagnostics.length > 0) {
      console.error(`formatting ${this.filePath} failed`);
    }
    if (linted.diagnostics.length > 0) {
      console.error(`linting ${this.filePath} failed`);
    }
    if (reformatted.diagnostics.length > 0) {
      console.error(`re-formatting ${this.filePath} failed`);
    }

    await writeFile(this.filePath, reformatted.content, { flag: "w+" });
    console.info("formatted and lint-fixed!");
  }
}

export const fileWriter = (filePath: string): FileWriter => {
  return new FileWriter(filePath);
};
