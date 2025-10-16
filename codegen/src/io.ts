import { existsSync, mkdirSync, writeFile } from "node:fs";
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

    const formatted = biome.formatContent(projectKey, this.buf, {
      filePath: this.filePath,
    });

    if (formatted.diagnostics.length > 0) {
      console.error(`formatting ${this.filePath} failed`);
    }

    writeFile(this.filePath, formatted.content, { flag: "w+" }, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.info("formatted!");
      }
    });
  }
}

export const fileWriter = (filePath: string): FileWriter => {
  return new FileWriter(filePath);
};
