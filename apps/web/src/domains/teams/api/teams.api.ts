import { apiClient } from "@/shared/lib/api-client";
import type {  CreateTeamData, UpdateTeamData, TeamResponse, DeleteResponse, TeamsResponse } from "../types/types";


class TeamsApi {
  async getTeams(): Promise<TeamsResponse> {
    return apiClient.get<TeamsResponse>("/admin/teams");
  }

  async createTeam(data: CreateTeamData): Promise<TeamResponse> {
    return apiClient.post<TeamResponse>("/admin/teams", data);
  }

  async updateTeam(teamId: string, data: UpdateTeamData): Promise<TeamResponse> {
    return apiClient.put<TeamResponse>(`/admin/teams/${teamId}`, data);
  }

  async deleteTeam(teamId: string): Promise<DeleteResponse> {
    return apiClient.delete<DeleteResponse>(`/admin/teams/${teamId}`);
  }

  async getTeamById(teamId: string): Promise<TeamResponse> {
    return apiClient.get<TeamResponse>(`/admin/teams/${teamId}`);
  }
}

export const teamsApi = new TeamsApi();
