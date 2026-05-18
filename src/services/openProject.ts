import axios, { AxiosInstance } from 'axios';
import { Config } from '../utils/config';

export interface WorkPackage {
  id: number;
  subject: string;
  description: string;
  status: string;
  lockVersion: number;
  updatedAt: string;
  projectId?: number;
  projectName?: string;
}

export interface Project {
  id: number;
  name: string;
  identifier: string;
}

export class OpenProjectService {
  private client: AxiosInstance;

  constructor(config: Config) {
    this.client = axios.create({
      baseURL: config.url.endsWith('/') ? config.url.slice(0, -1) : config.url,
      headers: {
        Authorization: `Basic ${Buffer.from(`apikey:${config.token}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getCurrentUserId(): Promise<number> {
    const response = await this.client.get('/api/v3/users/me');
    return response.data.id;
  }

  /**
   * Lista os projetos que o usuário tem acesso.
   */
  async getMyProjects(): Promise<Project[]> {
    // Por padrão, a API já retorna os projetos visíveis/acessíveis pelo usuário.
    const response = await this.client.get(
      `/api/v3/projects?pageSize=200`
    );

    return response.data._embedded.elements.map((item: any) => ({
      id: item.id,
      name: item.name,
      identifier: item.identifier,
    }));
  }

  /**
   * Busca os work packages atribuídos ao usuário, filtrando por projetos
   * selecionados e somente status considerados "abertos" (novo, em progresso
   * e relacionados — qualquer status que não esteja marcado como fechado).
   */
  async getMyWorkPackages(
    userId: number,
    projectIds: number[] = []
  ): Promise<WorkPackage[]> {
    const filterList: any[] = [
      { assignee: { operator: '=', values: [String(userId)] } },
      // Operador "o" = "open" — traz apenas status não fechados (novo,
      // em progresso, em revisão, etc.) e ignora os concluídos.
      { status: { operator: 'o', values: [] } },
    ];

    if (projectIds.length > 0) {
      filterList.push({
        project: { operator: '=', values: projectIds.map((id) => String(id)) },
      });
    }

    const filters = encodeURIComponent(JSON.stringify(filterList));
    const response = await this.client.get(
      `/api/v3/work_packages?pageSize=100&filters=${filters}`
    );

    return response.data._embedded.elements.map((item: any) => {
      const projectHref: string | undefined = item._links?.project?.href;
      const projectId = projectHref
        ? Number(projectHref.split('/').pop())
        : undefined;
      return {
        id: item.id,
        subject: item.subject,
        description: item.description?.raw || '',
        status: item._links.status.title,
        lockVersion: item.lockVersion,
        updatedAt: item.updatedAt,
        projectId,
        projectName: item._links?.project?.title,
      };
    });
  }

  async updateWorkPackageStatus(id: number, lockVersion: number, statusName: string): Promise<void> {
    // First, we need to find the status ID for the given status name
    // A more robust way is to fetch all statuses and find the id
    const statusesResponse = await this.client.get('/api/v3/statuses');
    const statuses = statusesResponse.data._embedded.elements;
    const targetStatus = statuses.find((s: any) => s.name.toLowerCase() === statusName.toLowerCase());

    if (!targetStatus) {
      throw new Error(`Status "${statusName}" not found in OpenProject.`);
    }

    await this.client.patch(`/api/v3/work_packages/${id}`, {
      lockVersion,
      _links: {
        status: {
          href: targetStatus._links.self.href,
        },
      },
    });
  }
}
