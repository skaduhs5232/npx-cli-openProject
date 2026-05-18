import fs from 'fs';
import path from 'path';
import os from 'os';

const configFilePath = path.join(os.homedir(), '.op-tasks-config.json');

export interface Config {
  url: string;
  token: string;
}

export interface SelectedProject {
  id: number;
  name: string;
  identifier: string;
}

export interface LocalConfig {
  projects: SelectedProject[];
}

export function getConfig(): Config | null {
  if (!fs.existsSync(configFilePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(configFilePath, 'utf8');
    return JSON.parse(data) as Config;
  } catch (error) {
    return null;
  }
}

export function saveConfig(config: Config): void {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Caminho do arquivo de configuração local (por projeto/diretório),
 * armazenado dentro da pasta .tasksOP do diretório atual.
 */
function getLocalConfigPath(): string {
  return path.join(process.cwd(), '.tasksOP', 'config.json');
}

export function getLocalConfig(): LocalConfig | null {
  const filePath = getLocalConfigPath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as LocalConfig;
  } catch (error) {
    return null;
  }
}

export function saveLocalConfig(config: LocalConfig): void {
  const filePath = getLocalConfigPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
}
