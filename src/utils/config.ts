import fs from 'fs';
import path from 'path';
import os from 'os';

const configFilePath = path.join(os.homedir(), '.op-tasks-config.json');

export interface Config {
  url: string;
  token: string;
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
